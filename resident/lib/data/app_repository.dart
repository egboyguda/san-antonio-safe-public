import 'dart:io';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import 'api_client.dart';
import 'app_database.dart';
import 'models.dart';

class AppSnapshot {
  const AppSnapshot({
    required this.references,
    required this.incidents,
    required this.alerts,
    required this.notifications,
    this.profile,
  });

  final ReferenceData references;
  final ResidentProfile? profile;
  final List<IncidentRecord> incidents;
  final List<AlertRecord> alerts;
  final List<AlertRecord> notifications;
}

class SyncResult {
  const SyncResult({required this.pendingCount, this.error});
  final int pendingCount;
  final String? error;
}

class AppRepository {
  AppRepository({AppDatabase? database, ApiClient? api, Uuid? uuid})
    : database = database ?? AppDatabase(),
      api = api ?? ApiClient(),
      uuid = uuid ?? const Uuid();

  static const _profileKey = 'profile';
  static const _referencesKey = 'references';
  static const _syncCursorKey = 'sync_cursor';
  static const _deviceIdKey = 'device_id';
  static const _onboardingKey = 'onboarding_v1_complete';

  final AppDatabase database;
  final ApiClient api;
  final Uuid uuid;

  Future<bool> isOnboardingComplete() async {
    final entry = await database.getCache(_onboardingKey);
    return entry != null && decodeJson(entry.data) == true;
  }

  Future<void> completeOnboarding() =>
      database.putCache(_onboardingKey, 'metadata', encodeJson(true));

  Future<String> get deviceId async {
    var value = await api.storage.read(key: _deviceIdKey);
    if (value == null || value.isEmpty) {
      value = uuid.v4();
      await api.storage.write(key: _deviceIdKey, value: value);
    }
    return value;
  }

  Future<bool> restoreSession() async {
    if (!await api.hasToken) return false;
    try {
      final session = await api.getSession();
      return session.isNotEmpty && session['session'] != null;
    } on AppException {
      return false;
    }
  }

  Future<void> signIn(String email, String password) async {
    await api.signIn(email, password);
    await api.getSession();
  }

  Future<void> register(String name, String email, String password) =>
      api.signUp(name, email, password);

  Future<void> signOut() => api.signOut();

  Future<AppSnapshot> loadCached() async {
    final profileEntry = await database.getCache(_profileKey);
    final referenceEntry = await database.getCache(_referencesKey);
    return AppSnapshot(
      profile: profileEntry == null
          ? null
          : ResidentProfile.fromJson(asJson(decodeJson(profileEntry.data))),
      references: referenceEntry == null
          ? const ReferenceData()
          : ReferenceData.fromJson(asJson(decodeJson(referenceEntry.data))),
      incidents: await _cachedIncidents(),
      alerts: await _cachedAlerts('alert'),
      notifications: await _cachedAlerts('notification'),
    );
  }

  Future<AppSnapshot> refresh() async {
    final cached = await loadCached();
    var profile = cached.profile;
    var references = cached.references;
    var incidents = cached.incidents;
    var alerts = cached.alerts;
    var notifications = cached.notifications;

    try {
      final serverProfile = ResidentProfile.fromJson(
        await api.getJson('/api/mobile/me'),
      );
      final pendingProfile = await _pendingProfileUpdate();
      final selectedProfile = pendingProfile ?? serverProfile;
      profile = selectedProfile;
      await database.putCache(
        _profileKey,
        'profile',
        encodeJson(selectedProfile.toJson()),
      );
    } on AppException {
      if (profile == null) rethrow;
    }
    try {
      references = ReferenceData.fromJson(await api.getJson('/api/reference'));
      await database.putCache(
        _referencesKey,
        'reference',
        encodeJson(references.toJson()),
      );
    } on AppException {
      if (references.categories.isEmpty) rethrow;
    }
    try {
      incidents = await _fetchIncidents();
    } on AppException {
      if (incidents.isEmpty) rethrow;
    }
    try {
      alerts = await _fetchAlerts('/api/alerts', 'alert');
    } on AppException {
      if (alerts.isEmpty) rethrow;
    }
    try {
      notifications = await _fetchAlerts('/api/notifications', 'notification');
    } on AppException {
      if (notifications.isEmpty) rethrow;
    }
    return AppSnapshot(
      profile: profile,
      references: references,
      incidents: incidents,
      alerts: alerts,
      notifications: notifications,
    );
  }

  Future<void> saveProfile(ResidentProfile profile) async {
    await database.putCache(
      _profileKey,
      'profile',
      encodeJson(profile.toJson()),
    );
    await _enqueue('update_profile', profile.toJson());
  }

  Future<void> saveIncident(IncidentRecord incident) async {
    await _putIncident(incident);
    await _enqueue('create_incident', incident.toApiJson());
  }

  Future<void> updateIncident(IncidentRecord incident) async {
    await _putIncident(incident);
    if (incident.serverId != null) {
      await api.patchJson(
        '/api/incidents/${incident.serverId}',
        incident.toApiJson(),
      );
      return;
    }
    final clientId = incident.clientReportId;
    final operation =
        await (database.select(database.pendingOperations)..where(
              (row) =>
                  row.type.equals('create_incident') &
                  row.payload.contains(clientId),
            ))
            .getSingleOrNull();
    if (operation != null) {
      await (database.update(
        database.pendingOperations,
      )..where((row) => row.id.equals(operation.id))).write(
        PendingOperationsCompanion(
          payload: Value(encodeJson(incident.toApiJson())),
          state: const Value('queued'),
          attempts: const Value(0),
          lastError: const Value(null),
          nextAttemptAt: const Value(null),
        ),
      );
    }
  }

  Future<void> retryIncident(String clientReportId) async {
    final entry = await database.getCache('incident:$clientReportId');
    if (entry == null) return;
    final incident = IncidentRecord.fromJson(asJson(decodeJson(entry.data)));
    await saveIncident(
      incident.copyWith(syncState: LocalSyncState.queued, clearError: true),
    );
  }

  Future<bool> deleteLocalIncident(String clientReportId) async {
    final entry = await database.getCache('incident:$clientReportId');
    if (entry == null) return false;
    final incident = IncidentRecord.fromJson(asJson(decodeJson(entry.data)));
    if (incident.serverId != null) return false;

    await database.transaction(() async {
      await database.deleteCache('incident:$clientReportId');
      await (database.delete(database.pendingOperations)..where(
            (row) =>
                row.type.equals('create_incident') &
                row.payload.contains(clientReportId),
          ))
          .go();
    });

    for (final path in incident.photoPaths) {
      try {
        final file = File(path);
        if (await file.exists()) await file.delete();
      } catch (_) {
        // The report is gone even if an old local photo file cannot be removed.
      }
    }
    return true;
  }

  Future<void> markAlertRead(String id, {bool notification = false}) async {
    final kind = notification ? 'notification' : 'alert';
    final entry = await database.getCache('$kind:$id');
    if (entry != null) {
      final alert = AlertRecord.fromJson(asJson(decodeJson(entry.data)));
      await database.putCache(
        '$kind:$id',
        kind,
        encodeJson(alert.copyWith(isRead: true).toJson()),
      );
    }
    if (notification) {
      await api.patchJson('/api/notifications/$id', {'isRead': true});
    } else {
      await api.postJson('/api/alerts/$id/read', const {});
    }
  }

  Future<SyncResult> syncNow() async {
    await _repairLegacyIncidentOperations();
    final operations = await _locallyValidOperations(
      await database.dueOperations(),
    );
    try {
      if (operations.isNotEmpty) await _pushOperations(operations);
      await _pullUpdates();
      return SyncResult(pendingCount: (await database.dueOperations()).length);
    } on AppException catch (error) {
      for (final operation in operations) {
        await _recordFailure(operation, error.message);
      }
      return SyncResult(
        pendingCount: (await database.dueOperations()).length,
        error: error.message,
      );
    } catch (_) {
      for (final operation in operations) {
        await _recordFailure(
          operation,
          'Sync will retry when a connection is available.',
        );
      }
      return SyncResult(
        pendingCount: (await database.dueOperations()).length,
        error: 'Sync will retry when a connection is available.',
      );
    }
  }

  Future<void> _pushOperations(List<PendingOperation> operations) async {
    final response = await api.postJson('/api/mobile/sync', {
      'clientBatchId': uuid.v4(),
      'deviceId': await deviceId,
      'operations': operations
          .map(
            (operation) => {
              'clientOperationId': operation.id,
              'type': operation.type,
              'payload': _payloadForOperation(operation),
            },
          )
          .toList(),
    });

    final results = jsonList(response['results']);
    for (final result in results) {
      final operationId = stringValue(result, ['clientOperationId']);
      PendingOperation? operation;
      for (final candidate in operations) {
        if (candidate.id == operationId) operation = candidate;
      }
      if (operation == null) continue;

      final status = stringValue(result, ['status']).toLowerCase();
      if (status == 'rejected' || status == 'failed') {
        await (database.update(
          database.pendingOperations,
        )..where((row) => row.id.equals(operationId))).write(
          PendingOperationsCompanion(
            state: const Value('rejected'),
            lastError: Value(
              stringValue(result, [
                'error',
                'message',
              ], 'Server rejected this item.'),
            ),
          ),
        );
        await _setIncidentFailure(operation, LocalSyncState.rejected);
        continue;
      }
      if (operation.type == 'create_incident') {
        await _attachServerIncident(
          stringValue(result, ['clientReportId']),
          stringValue(result, ['serverId', 'id']),
        );
      }
      await (database.delete(
        database.pendingOperations,
      )..where((row) => row.id.equals(operationId))).go();
    }
    if (results.isEmpty) {
      throw const AppException(
        'The server returned no result for the queued items.',
      );
    }
  }

  Future<void> _attachServerIncident(
    String clientReportId,
    String serverId,
  ) async {
    if (clientReportId.isEmpty || serverId.isEmpty) return;
    final entry = await database.getCache('incident:$clientReportId');
    if (entry == null) return;
    var incident = IncidentRecord.fromJson(
      asJson(decodeJson(entry.data)),
    ).copyWith(serverId: serverId, syncState: LocalSyncState.uploading);
    await _putIncident(incident);

    final uploaded = [...incident.uploadedPhotoPaths];
    for (var index = 0; index < incident.photoPaths.length; index++) {
      final path = incident.photoPaths[index];
      if (uploaded.contains(path)) continue;
      await api.uploadPhoto(
        incidentId: serverId,
        clientPhotoId: '$clientReportId-photo-$index',
        path: path,
      );
      uploaded.add(path);
      incident = incident.copyWith(uploadedPhotoPaths: uploaded);
      await _putIncident(incident);
    }
    await _putIncident(
      incident.copyWith(syncState: LocalSyncState.synced, clearError: true),
    );
  }

  Future<void> _pullUpdates() async {
    final cursor = await database.getCache(_syncCursorKey);
    final response = await api.getJson(
      '/api/mobile/sync',
      queryParameters: cursor == null
          ? null
          : {'since': decodeJson(cursor.data).toString()},
    );
    await database.transaction(() async {
      for (final json in jsonList(response['incidents'])) {
        await _mergeServerIncident(IncidentRecord.fromJson(json));
      }
      await _storeAlerts(response['alerts'], 'alert');
      await _storeAlerts(response['notifications'], 'notification');
      if (response['reference'] != null) {
        final references = ReferenceData.fromJson(
          asJson(response['reference']),
        );
        await database.putCache(
          _referencesKey,
          'reference',
          encodeJson(references.toJson()),
        );
      }
      final serverTime = response['serverTime']?.toString();
      if (serverTime != null && serverTime.isNotEmpty) {
        await database.putCache(
          _syncCursorKey,
          'metadata',
          encodeJson(serverTime),
        );
      }
    });
  }

  Future<List<IncidentRecord>> _fetchIncidents() async {
    final response = await api.getData('/api/incidents');
    final source = response is Map
        ? response['incidents'] ?? response['data'] ?? response['items']
        : response;
    for (final json in jsonList(source)) {
      await _mergeServerIncident(IncidentRecord.fromJson(json));
    }
    return _cachedIncidents();
  }

  Future<List<AlertRecord>> _fetchAlerts(String path, String kind) async {
    final response = await api.getData(path);
    final source = response is Map
        ? response[kind == 'alert' ? 'alerts' : 'notifications'] ??
              response['data'] ??
              response['items']
        : response;
    await _storeAlerts(source, kind);
    return _cachedAlerts(kind);
  }

  Future<void> _storeAlerts(dynamic source, String kind) async {
    for (final json in jsonList(source)) {
      final alert = AlertRecord.fromJson(json);
      if (alert.id.isNotEmpty) {
        await database.putCache(
          '$kind:${alert.id}',
          kind,
          encodeJson(alert.toJson()),
        );
      }
    }
  }

  Future<void> _mergeServerIncident(IncidentRecord server) async {
    if (server.clientReportId.isEmpty) return;
    final key = 'incident:${server.clientReportId}';
    final entry = await database.getCache(key);
    if (entry == null) {
      await _putIncident(server);
      return;
    }
    final local = IncidentRecord.fromJson(asJson(decodeJson(entry.data)));
    await _putIncident(
      IncidentRecord(
        clientReportId: server.clientReportId,
        serverId: server.serverId,
        categoryId: server.categoryId,
        title: server.title,
        description: server.description,
        severity: server.severity,
        status: server.status,
        barangayId: server.barangayId,
        latitude: server.latitude,
        longitude: server.longitude,
        locationAccuracy: server.locationAccuracy,
        approximateAddress: server.approximateAddress,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
        remarks: server.remarks,
        photoPaths: local.photoPaths,
        uploadedPhotoPaths: local.uploadedPhotoPaths,
        syncState: local.syncState == LocalSyncState.rejected
            ? local.syncState
            : LocalSyncState.synced,
        syncError: local.syncError,
      ),
    );
  }

  Future<void> _putIncident(IncidentRecord incident) => database.putCache(
    'incident:${incident.clientReportId}',
    'incident',
    encodeJson(incident.toJson()),
  );

  Future<List<IncidentRecord>> _cachedIncidents() async {
    final entries = await database.getCacheKind('incident');
    return entries
        .map((entry) => IncidentRecord.fromJson(asJson(decodeJson(entry.data))))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<List<AlertRecord>> _cachedAlerts(String kind) async {
    final entries = await database.getCacheKind(kind);
    return entries
        .map((entry) => AlertRecord.fromJson(asJson(decodeJson(entry.data))))
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  Future<void> _enqueue(String type, Json payload) async {
    if (type == 'update_profile') {
      final existing =
          await (database.select(database.pendingOperations)
                ..where((row) => row.type.equals(type))
                ..orderBy([(row) => OrderingTerm.asc(row.createdAt)]))
              .get();
      if (existing.isNotEmpty) {
        final current = existing.last;
        await (database.update(
          database.pendingOperations,
        )..where((row) => row.id.equals(current.id))).write(
          PendingOperationsCompanion(
            payload: Value(encodeJson(payload)),
            state: const Value('queued'),
            attempts: const Value(0),
            lastError: const Value(null),
            nextAttemptAt: const Value(null),
          ),
        );
        for (final stale in existing.where((item) => item.id != current.id)) {
          await (database.delete(
            database.pendingOperations,
          )..where((row) => row.id.equals(stale.id))).go();
        }
        return;
      }
    }
    if (type == 'create_incident') {
      payload = _normalizeCreateIncidentPayload(payload);
      final clientId = payload['clientReportId']?.toString() ?? '';
      final existing =
          await (database.select(database.pendingOperations)..where(
                (row) => row.type.equals(type) & row.payload.contains(clientId),
              ))
              .getSingleOrNull();
      if (existing != null) {
        await (database.update(
          database.pendingOperations,
        )..where((row) => row.id.equals(existing.id))).write(
          PendingOperationsCompanion(
            payload: Value(encodeJson(payload)),
            state: const Value('queued'),
            attempts: const Value(0),
            lastError: const Value(null),
            nextAttemptAt: const Value(null),
          ),
        );
        return;
      }
    }
    await database
        .into(database.pendingOperations)
        .insert(
          PendingOperationsCompanion.insert(
            id: uuid.v4(),
            type: type,
            payload: encodeJson(payload),
            createdAt: DateTime.now().millisecondsSinceEpoch,
          ),
        );
  }

  Future<List<PendingOperation>> _locallyValidOperations(
    List<PendingOperation> operations,
  ) async {
    final valid = <PendingOperation>[];
    for (final operation in operations) {
      final error = _localCreateIncidentError(operation);
      if (error == null) {
        valid.add(operation);
        continue;
      }
      await (database.update(
        database.pendingOperations,
      )..where((row) => row.id.equals(operation.id))).write(
        PendingOperationsCompanion(
          state: const Value('rejected'),
          lastError: Value(error),
          nextAttemptAt: const Value(null),
        ),
      );
      await _setIncidentFailure(operation, LocalSyncState.rejected, error);
    }
    return valid;
  }

  String? _localCreateIncidentError(PendingOperation operation) {
    if (operation.type != 'create_incident') return null;
    final payload = _normalizeCreateIncidentPayload(
      asJson(decodeJson(operation.payload)),
    );
    if (doubleValue(payload['latitude']) == null ||
        doubleValue(payload['longitude']) == null) {
      return 'Tap the map or use GPS to set the incident location.';
    }
    return null;
  }

  Future<void> _repairLegacyIncidentOperations() async {
    final operations = await (database.select(
      database.pendingOperations,
    )..where((row) => row.type.equals('create_incident'))).get();
    for (final operation in operations) {
      final payload = asJson(decodeJson(operation.payload));
      if (!_hasLegacyIncidentCategory(payload)) continue;
      final normalizedPayload = _normalizeCreateIncidentPayload(payload);
      await (database.update(
        database.pendingOperations,
      )..where((row) => row.id.equals(operation.id))).write(
        PendingOperationsCompanion(
          payload: Value(encodeJson(normalizedPayload)),
          state: const Value('queued'),
          attempts: const Value(0),
          lastError: const Value(null),
          nextAttemptAt: const Value(null),
        ),
      );
      await _repairCachedIncident(normalizedPayload);
    }
  }

  bool _hasLegacyIncidentCategory(Json payload) {
    final categoryId = stringValue(payload, [
      'incidentCategoryId',
      'categoryId',
    ]);
    return normalizeIncidentCategoryId(categoryId) != categoryId;
  }

  Future<void> _repairCachedIncident(Json payload) async {
    final clientId = stringValue(payload, ['clientReportId']);
    if (clientId.isEmpty) return;
    final entry = await database.getCache('incident:$clientId');
    if (entry == null) return;
    final incident = IncidentRecord.fromJson(asJson(decodeJson(entry.data)));
    await _putIncident(
      incident.copyWith(
        categoryId: stringValue(payload, ['incidentCategoryId', 'categoryId']),
        syncState: LocalSyncState.queued,
        clearError: true,
      ),
    );
  }

  Json _payloadForOperation(PendingOperation operation) {
    final payload = asJson(decodeJson(operation.payload));
    if (operation.type != 'create_incident') return payload;
    return _normalizeCreateIncidentPayload(payload);
  }

  Json _normalizeCreateIncidentPayload(Json payload) {
    final categoryId = stringValue(payload, [
      'incidentCategoryId',
      'categoryId',
    ]);
    final normalizedCategoryId = normalizeIncidentCategoryId(categoryId);
    if (normalizedCategoryId.isEmpty || normalizedCategoryId == categoryId) {
      return payload;
    }
    return {...payload, 'incidentCategoryId': normalizedCategoryId};
  }

  Future<ResidentProfile?> _pendingProfileUpdate() async {
    final operation =
        await (database.select(database.pendingOperations)
              ..where((row) => row.type.equals('update_profile'))
              ..orderBy([(row) => OrderingTerm.desc(row.createdAt)])
              ..limit(1))
            .getSingleOrNull();
    if (operation == null) return null;
    return ResidentProfile.fromJson(asJson(decodeJson(operation.payload)));
  }

  Future<void> _recordFailure(PendingOperation operation, String error) async {
    final attempts = operation.attempts + 1;
    final seconds = (15 * (1 << attempts.clamp(0, 10))).clamp(30, 21600);
    await (database.update(
      database.pendingOperations,
    )..where((row) => row.id.equals(operation.id))).write(
      PendingOperationsCompanion(
        state: const Value('failed'),
        attempts: Value(attempts),
        lastError: Value(error),
        nextAttemptAt: Value(
          DateTime.now().add(Duration(seconds: seconds)).millisecondsSinceEpoch,
        ),
      ),
    );
    await _setIncidentFailure(operation, LocalSyncState.failed, error);
  }

  Future<void> _setIncidentFailure(
    PendingOperation operation,
    LocalSyncState state, [
    String? error,
  ]) async {
    if (operation.type != 'create_incident') return;
    final payload = asJson(decodeJson(operation.payload));
    final clientId = stringValue(payload, ['clientReportId']);
    final entry = await database.getCache('incident:$clientId');
    if (entry == null) return;
    final incident = IncidentRecord.fromJson(asJson(decodeJson(entry.data)));
    await _putIncident(incident.copyWith(syncState: state, syncError: error));
  }
}
