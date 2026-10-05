abstract interface class PushNotificationService {
  bool get isConfigured;
  Future<void> initialize();
  Stream<String> get openedNotificationIds;
}

class ApiInboxPushService implements PushNotificationService {
  const ApiInboxPushService();

  @override
  bool get isConfigured => false;

  @override
  Future<void> initialize() async {}

  @override
  Stream<String> get openedNotificationIds => const Stream.empty();
}
