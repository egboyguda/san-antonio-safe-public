import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:workmanager/workmanager.dart';

import 'data/app_repository.dart';
import 'data/models.dart';

enum SessionStatus { booting, signedOut, signedIn }

enum OnboardingStatus { checking, required, completed }

class AppState {
  const AppState({
    this.sessionStatus = SessionStatus.booting,
    this.onboardingStatus = OnboardingStatus.checking,
    this.profile,
    this.references = const ReferenceData(),
    this.incidents = const [],
    this.alerts = const [],
    this.notifications = const [],
    this.isBusy = false,
    this.isSyncing = false,
    this.activeServerRequests = 0,
    this.isOnline = true,
    this.pendingCount = 0,
    this.message,
  });

  final SessionStatus sessionStatus;
  final OnboardingStatus onboardingStatus;
  final ResidentProfile? profile;
  final ReferenceData references;
  final List<IncidentRecord> incidents;
  final List<AlertRecord> alerts;
  final List<AlertRecord> notifications;
  final bool isBusy;
  final bool isSyncing;
  final int activeServerRequests;
  final bool isOnline;
  final int pendingCount;
  final String? message;

  bool get isRequestingServer => activeServerRequests > 0;

  AppState copyWith({
    SessionStatus? sessionStatus,
    OnboardingStatus? onboardingStatus,
    ResidentProfile? profile,
    ReferenceData? references,
    List<IncidentRecord>? incidents,
    List<AlertRecord>? alerts,
    List<AlertRecord>? notifications,
    bool? isBusy,
    bool? isSyncing,
    int? activeServerRequests,
    bool? isOnline,
    int? pendingCount,
    String? message,
    bool clearMessage = false,
  }) => AppState(
    sessionStatus: sessionStatus ?? this.sessionStatus,
    onboardingStatus: onboardingStatus ?? this.onboardingStatus,
    profile: profile ?? this.profile,
    references: references ?? this.references,
    incidents: incidents ?? this.incidents,
    alerts: alerts ?? this.alerts,
    notifications: notifications ?? this.notifications,
    isBusy: isBusy ?? this.isBusy,
    isSyncing: isSyncing ?? this.isSyncing,
    activeServerRequests: activeServerRequests ?? this.activeServerRequests,
    isOnline: isOnline ?? this.isOnline,
    pendingCount: pendingCount ?? this.pendingCount,
    message: clearMessage ? null : (message ?? this.message),
  );
}

final repositoryProvider = Provider<AppRepository>((ref) => AppRepository());

final appControllerProvider = NotifierProvider<AppController, AppState>(
  AppController.new,
);

class AppController extends Notifier<AppState> {
  static const _sosIncidentCategoryId = 'other';

  late final AppRepository _repository;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  @override
  AppState build() {
    _repository = ref.read(repositoryProvider);
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      results,
    ) {
      final online = !results.contains(ConnectivityResult.none);
      state = state.copyWith(isOnline: online);
      if (online && state.sessionStatus == SessionStatus.signedIn) {
        unawaited(sync());
      }
    });
    ref.onDispose(() => _connectivitySubscription?.cancel());
    Future.microtask(bootstrap);
    return const AppState();
  }

  Future<void> bootstrap() async {
    final cached = await _repository.loadCached();
    state = state.copyWith(
      profile: cached.profile,
      references: cached.references,
      incidents: cached.incidents,
      alerts: cached.alerts,
      notifications: cached.notifications,
    );
    final onboardingComplete = await _repository.isOnboardingComplete();
    if (!onboardingComplete) {
      state = state.copyWith(onboardingStatus: OnboardingStatus.required);
      return;
    }
    state = state.copyWith(onboardingStatus: OnboardingStatus.completed);
    await _restoreSession();
  }

  Future<void> completeOnboarding() async {
    await _repository.completeOnboarding();
    state = state.copyWith(onboardingStatus: OnboardingStatus.completed);
    await _restoreSession();
  }

  Future<void> _restoreSession() async {
    _beginServerRequest();
    try {
      final signedIn = await _repository.restoreSession();
      if (!signedIn) {
        state = state.copyWith(sessionStatus: SessionStatus.signedOut);
        return;
      }
      state = state.copyWith(sessionStatus: SessionStatus.signedIn);
      await sync();
      await refresh(silent: true);
      await _scheduleBackgroundSync();
    } finally {
      _endServerRequest();
    }
  }

  Future<bool> login(String email, String password) async {
    _beginServerRequest();
    state = state.copyWith(isBusy: true, clearMessage: true);
    try {
      await _repository.signIn(email, password);
      state = state.copyWith(
        sessionStatus: SessionStatus.signedIn,
        isBusy: false,
      );
      await refresh(silent: true);
      await _scheduleBackgroundSync();
      unawaited(sync());
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isBusy: false, message: error.message);
      return false;
    } finally {
      _endServerRequest();
    }
  }

  Future<bool> register(String name, String email, String password) async {
    _beginServerRequest();
    state = state.copyWith(isBusy: true, clearMessage: true);
    try {
      await _repository.register(name, email, password);
      state = state.copyWith(
        sessionStatus: SessionStatus.signedIn,
        isBusy: false,
      );
      await refresh(silent: true);
      await _scheduleBackgroundSync();
      return true;
    } on AppException catch (error) {
      state = state.copyWith(isBusy: false, message: error.message);
      return false;
    } finally {
      _endServerRequest();
    }
  }

  Future<void> logout() async {
    _beginServerRequest();
    state = state.copyWith(isBusy: true);
    try {
      await _repository.signOut();
      state = const AppState(
        sessionStatus: SessionStatus.signedOut,
        onboardingStatus: OnboardingStatus.completed,
      );
    } finally {
      _endServerRequest();
    }
  }

  Future<void> refresh({bool silent = false}) async {
    _beginServerRequest();
    if (!silent) state = state.copyWith(isBusy: true, clearMessage: true);
    try {
      final snapshot = await _repository.refresh();
      state = state.copyWith(
        profile: snapshot.profile,
        references: snapshot.references,
        incidents: snapshot.incidents,
        alerts: snapshot.alerts,
        notifications: snapshot.notifications,
        isBusy: false,
        clearMessage: true,
      );
    } on AppException catch (error) {
      state = state.copyWith(isBusy: false, message: error.message);
    } finally {
      _endServerRequest();
    }
  }

  Future<void> sync() async {
    if (state.isSyncing || state.sessionStatus != SessionStatus.signedIn) {
      return;
    }
    _beginServerRequest();
    state = state.copyWith(isSyncing: true, clearMessage: true);
    try {
      final result = await _repository.syncNow();
      final cached = await _repository.loadCached();
      state = state.copyWith(
        profile: cached.profile,
        references: cached.references,
        incidents: cached.incidents,
        alerts: cached.alerts,
        notifications: cached.notifications,
        pendingCount: result.pendingCount,
        isSyncing: false,
        message: result.error,
        clearMessage: result.error == null,
      );
    } finally {
      if (state.isSyncing) state = state.copyWith(isSyncing: false);
      _endServerRequest();
    }
  }

  Future<void> saveProfile(ResidentProfile profile) async {
    await _repository.saveProfile(profile);
    state = state.copyWith(profile: profile);
    await sync();
  }

  Future<void> submitIncident({
    required String categoryId,
    required String title,
    required String description,
    required String severity,
    required String barangayId,
    required double? latitude,
    required double? longitude,
    required double? accuracy,
    required String approximateAddress,
    required List<String> photoPaths,
  }) async {
    final incident = IncidentRecord(
      clientReportId: _repository.uuid.v4(),
      categoryId: categoryId,
      title: title,
      description: description,
      severity: severity,
      status: 'pending',
      barangayId: barangayId,
      latitude: latitude,
      longitude: longitude,
      locationAccuracy: accuracy,
      approximateAddress: approximateAddress,
      createdAt: DateTime.now(),
      photoPaths: photoPaths,
      syncState: LocalSyncState.queued,
    );
    await _repository.saveIncident(incident);
    state = state.copyWith(incidents: [incident, ...state.incidents]);
    unawaited(sync());
  }

  Future<void> sendSos() async {
    state = state.copyWith(isBusy: true, clearMessage: true);
    final position = await _bestPosition();
    final barangayId = state.profile?.barangayId ?? '';
    final incident = IncidentRecord(
      clientReportId: _repository.uuid.v4(),
      categoryId: _sosIncidentCategoryId,
      title: 'Emergency SOS',
      description: position == null
          ? 'Resident sent SOS using their saved profile area.'
          : 'Resident sent an immediate SOS from the mobile app.',
      severity: 'critical',
      status: 'pending',
      barangayId: barangayId,
      latitude: position?.latitude,
      longitude: position?.longitude,
      locationAccuracy: position?.accuracy,
      approximateAddress: position == null
          ? (state.profile?.address ?? '')
          : '',
      createdAt: DateTime.now(),
      syncState: LocalSyncState.queued,
    );
    await _repository.saveIncident(incident);
    state = state.copyWith(
      incidents: [incident, ...state.incidents],
      isBusy: false,
      message: 'SOS queued. San Antonio responders will receive it on sync.',
    );
    unawaited(sync());
  }

  Future<void> retryIncident(String id) async {
    await _repository.retryIncident(id);
    await sync();
  }

  Future<bool> deleteLocalIncident(IncidentRecord incident) async {
    final deleted = await _repository.deleteLocalIncident(
      incident.clientReportId,
    );
    if (!deleted) {
      state = state.copyWith(
        message: 'Only reports queued on this device can be deleted.',
      );
      return false;
    }
    state = state.copyWith(
      incidents: state.incidents
          .where((item) => item.clientReportId != incident.clientReportId)
          .toList(),
      message: 'Pending report deleted.',
    );
    return true;
  }

  Future<bool> updateIncidentDetails(
    IncidentRecord incident,
    String title,
    String description,
  ) async {
    _beginServerRequest();
    final updated = IncidentRecord(
      clientReportId: incident.clientReportId,
      serverId: incident.serverId,
      categoryId: incident.categoryId,
      title: title.trim(),
      description: description.trim(),
      severity: incident.severity,
      status: incident.status,
      barangayId: incident.barangayId,
      latitude: incident.latitude,
      longitude: incident.longitude,
      locationAccuracy: incident.locationAccuracy,
      approximateAddress: incident.approximateAddress,
      createdAt: incident.createdAt,
      updatedAt: DateTime.now(),
      remarks: incident.remarks,
      photoPaths: incident.photoPaths,
      uploadedPhotoPaths: incident.uploadedPhotoPaths,
      syncState: incident.serverId == null
          ? LocalSyncState.queued
          : incident.syncState,
    );
    try {
      await _repository.updateIncident(updated);
      state = state.copyWith(
        incidents: state.incidents
            .map(
              (item) => item.clientReportId == updated.clientReportId
                  ? updated
                  : item,
            )
            .toList(),
      );
      unawaited(sync());
      return true;
    } on AppException catch (error) {
      state = state.copyWith(message: error.message);
      return false;
    } finally {
      _endServerRequest();
    }
  }

  Future<void> markAlertRead(String id, {bool notification = false}) async {
    _beginServerRequest();
    try {
      await _repository.markAlertRead(id, notification: notification);
    } on AppException catch (error) {
      state = state.copyWith(message: error.message);
    } finally {
      _endServerRequest();
    }
    final list = notification ? state.notifications : state.alerts;
    final updated = list
        .map((item) => item.id == id ? item.copyWith(isRead: true) : item)
        .toList();
    state = notification
        ? state.copyWith(notifications: updated)
        : state.copyWith(alerts: updated);
  }

  void clearMessage() => state = state.copyWith(clearMessage: true);

  void _beginServerRequest() {
    state = state.copyWith(
      activeServerRequests: state.activeServerRequests + 1,
    );
  }

  void _endServerRequest() {
    final count = state.activeServerRequests;
    state = state.copyWith(activeServerRequests: count > 0 ? count - 1 : 0);
  }

  Future<Position?> _bestPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return Geolocator.getLastKnownPosition();
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return Geolocator.getLastKnownPosition();
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
    } catch (_) {
      return Geolocator.getLastKnownPosition();
    }
  }

  Future<void> _scheduleBackgroundSync() async {
    try {
      await Workmanager().registerPeriodicTask(
        'resident-periodic-sync',
        'residentSync',
        frequency: const Duration(minutes: 15),
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
        backoffPolicy: BackoffPolicy.exponential,
        backoffPolicyDelay: const Duration(seconds: 30),
      );
    } catch (_) {
      // Foreground sync remains available on unsupported platforms.
    }
  }
}
