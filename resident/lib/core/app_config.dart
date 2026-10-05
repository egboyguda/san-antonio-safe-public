class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
  static const maxPhotoBytes = 5 * 1024 * 1024;
  static const appName = 'SanAntonioSafe';
}
