import 'package:flutter_test/flutter_test.dart';
import 'package:san_antonio_safe/data/models.dart';

void main() {
  group('IncidentRecord', () {
    test('encodes the server incident contract', () {
      final incident = IncidentRecord(
        clientReportId: 'local-123',
        categoryId: 'fire',
        title: 'House fire',
        description: 'Smoke near the municipal road.',
        severity: 'critical',
        status: 'pending',
        barangayId: 'ward-1',
        latitude: 12.412,
        longitude: 124.279,
        locationAccuracy: 8,
        createdAt: DateTime.utc(2026, 7, 4, 3),
        syncState: LocalSyncState.queued,
      );

      final json = incident.toApiJson();

      expect(json['clientReportId'], 'local-123');
      expect(json['incidentCategoryId'], 'fire');
      expect(json['severityLevel'], 'critical');
      expect(json['latitude'], 12.412);
      expect(json.containsKey('photoPaths'), isFalse);
    });

    test('normalizes legacy resident category IDs', () {
      expect(normalizeIncidentCategoryId('sos'), 'other');
      expect(
        normalizeIncidentCategoryId('public-safety'),
        'crime-public-safety',
      );
      expect(normalizeIncidentCategoryId('fire'), 'fire');
    });
    test('keeps local sync metadata through cache decoding', () {
      final incident = IncidentRecord.fromJson({
        'clientReportId': 'local-1',
        'title': 'SOS',
        'description': 'Emergency',
        'severityLevel': 'critical',
        'status': 'pending',
        'incidentCategoryId': 'other',
        'barangayId': 'ward-1',
        'clientCreatedAt': '2026-07-04T03:00:00.000Z',
        'localSyncState': 'failed',
        'syncError': 'offline',
      });

      expect(incident.syncState, LocalSyncState.failed);
      expect(incident.syncError, 'offline');
      expect(incident.serverId, isNull);
    });
  });

  test('reference decoder accepts wrapped backend payloads', () {
    final references = ReferenceData.fromJson({
      'reference': {
        'barangays': [
          {'id': 'ward-1', 'name': 'Ward I'},
        ],
        'incidentCategories': [
          {'id': 'other', 'name': 'Other emergency'},
        ],
      },
    });

    expect(references.barangays.single.name, 'Ward I');
    expect(references.categories.single.id, 'other');
  });

  test('profile decoder accepts data-wrapped mobile responses', () {
    final profile = ResidentProfile.fromJson({
      'data': {
        'user': {
          'id': 'resident-1',
          'name': 'Juan Dela Cruz',
          'email': 'juan@example.com',
        },
        'profile': {
          'mobileNumber': '09171234567',
          'barangayId': 'ward-1',
          'address': 'Ward I',
        },
      },
    });

    expect(profile.email, 'juan@example.com');
    expect(profile.mobileNumber, '09171234567');
    expect(profile.needsCompletion, isFalse);
  });
}
