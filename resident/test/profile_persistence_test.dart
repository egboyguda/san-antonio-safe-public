import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:san_antonio_safe/data/api_client.dart';
import 'package:san_antonio_safe/data/app_database.dart';
import 'package:san_antonio_safe/data/app_repository.dart';
import 'package:san_antonio_safe/data/models.dart';

void main() {
  test('pending local profile is not replaced by stale server data', () async {
    final database = AppDatabase.forTesting(NativeDatabase.memory());
    final repository = AppRepository(
      database: database,
      api: _StaleProfileApiClient(),
    );
    addTearDown(database.close);
    const local = ResidentProfile(
      id: 'resident-1',
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      mobileNumber: '09171234567',
      barangayId: 'ward-1',
      address: 'Ward I',
      emergencyContactName: 'Maria',
      emergencyContactNumber: '09170000000',
    );

    await repository.saveProfile(local);
    await database.putCache(
      'profile',
      'profile',
      encodeJson(
        ResidentProfile(
          id: local.id,
          name: local.name,
          email: local.email,
          mobileNumber: '',
          barangayId: '',
          address: '',
          emergencyContactName: '',
          emergencyContactNumber: '',
        ).toJson(),
      ),
    );
    final refreshed = await repository.refresh();

    expect(refreshed.profile?.needsCompletion, isFalse);
    expect(refreshed.profile?.mobileNumber, '09171234567');
    expect(refreshed.profile?.barangayId, 'ward-1');
  });

  test('repeated profile saves keep only the latest queued update', () async {
    final database = AppDatabase.forTesting(NativeDatabase.memory());
    final repository = AppRepository(database: database);
    addTearDown(database.close);
    const original = ResidentProfile(
      id: 'resident-1',
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      mobileNumber: '09171234567',
      barangayId: 'ward-1',
      address: 'Ward I',
      emergencyContactName: 'Maria',
      emergencyContactNumber: '09170000000',
    );
    final updated = ResidentProfile(
      id: original.id,
      name: original.name,
      email: original.email,
      mobileNumber: '09991234567',
      barangayId: original.barangayId,
      address: original.address,
      emergencyContactName: original.emergencyContactName,
      emergencyContactNumber: original.emergencyContactNumber,
    );

    await repository.saveProfile(original);
    await repository.saveProfile(updated);

    final operations = await (database.select(
      database.pendingOperations,
    )..where((row) => row.type.equals('update_profile'))).get();
    final payload = asJson(decodeJson(operations.single.payload));
    expect(operations, hasLength(1));
    expect(payload['mobileNumber'], '09991234567');
  });

  test('local incident delete removes cache and queued operation', () async {
    final database = AppDatabase.forTesting(NativeDatabase.memory());
    final repository = AppRepository(database: database);
    addTearDown(database.close);
    final incident = IncidentRecord(
      clientReportId: 'local-delete',
      categoryId: 'fire',
      title: 'House fire',
      description: 'Smoke near the road.',
      severity: 'critical',
      status: 'pending',
      barangayId: 'ward-1',
      latitude: 12.412,
      longitude: 124.279,
      createdAt: DateTime.utc(2026, 7, 4, 3),
      syncState: LocalSyncState.queued,
    );

    await repository.saveIncident(incident);

    expect(await database.getCache('incident:local-delete'), isNotNull);
    expect(await database.dueOperations(), hasLength(1));

    expect(await repository.deleteLocalIncident('local-delete'), isTrue);

    expect(await database.getCache('incident:local-delete'), isNull);
    expect(await database.dueOperations(), isEmpty);
  });
}

class _StaleProfileApiClient extends ApiClient {
  @override
  Future<Json> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    if (path == '/api/mobile/me') {
      return {
        'user': {
          'id': 'resident-1',
          'name': 'Juan Dela Cruz',
          'email': 'juan@example.com',
        },
        'profile': {
          'userId': 'resident-1',
          'name': 'Juan Dela Cruz',
          'mobileNumber': '',
          'barangayId': '',
          'address': '',
        },
      };
    }
    if (path == '/api/reference') {
      return {
        'barangays': [
          {'id': 'ward-1', 'name': 'Ward I'},
        ],
        'incidentCategories': [
          {'id': 'other', 'name': 'Other emergency'},
        ],
      };
    }
    return {};
  }

  @override
  Future<dynamic> getData(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return <Json>[];
  }
}
