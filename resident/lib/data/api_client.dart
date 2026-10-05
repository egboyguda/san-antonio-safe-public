import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mime/mime.dart';

import '../core/app_config.dart';
import 'models.dart';

class ApiClient {
  ApiClient({Dio? dio, FlutterSecureStorage? storage})
    : dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConfig.apiBaseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 25),
              headers: {'Accept': 'application/json'},
            ),
          ),
      storage = storage ?? const FlutterSecureStorage() {
    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await this.storage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  static const _tokenKey = 'better_auth_token';
  final Dio dio;
  final FlutterSecureStorage storage;

  Future<bool> get hasToken async =>
      (await storage.read(key: _tokenKey))?.isNotEmpty == true;

  Future<Json> signIn(String email, String password) async {
    final response = await _request(
      () => dio.post(
        '/api/auth/sign-in/email',
        data: {'email': email.trim(), 'password': password},
      ),
    );
    await _captureToken(response);
    return asJson(response.data);
  }

  Future<Json> signUp(String name, String email, String password) async {
    final response = await _request(
      () => dio.post(
        '/api/auth/sign-up/email',
        data: {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
        },
      ),
    );
    await _captureToken(response);
    return asJson(response.data);
  }

  Future<void> _captureToken(Response<dynamic> response) async {
    final token =
        response.headers.value('set-auth-token') ??
        response.headers.value('Set-Auth-Token');
    if (token == null || token.isEmpty) {
      throw const AppException(
        'The server did not return a mobile session token.',
      );
    }
    await storage.write(key: _tokenKey, value: token);
  }

  Future<Json> getSession() async {
    final response = await _request(() => dio.get('/api/auth/get-session'));
    return asJson(response.data);
  }

  Future<void> signOut() async {
    try {
      await _request(() => dio.post('/api/auth/sign-out'));
    } finally {
      await storage.delete(key: _tokenKey);
    }
  }

  Future<Json> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _request(
      () => dio.get(path, queryParameters: queryParameters),
    );
    return asJson(response.data);
  }

  Future<dynamic> getData(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = await _request(
      () => dio.get(path, queryParameters: queryParameters),
    );
    return response.data;
  }

  Future<Json> postJson(String path, Json data) async {
    final response = await _request(() => dio.post(path, data: data));
    return asJson(response.data);
  }

  Future<Json> patchJson(String path, Json data) async {
    final response = await _request(() => dio.patch(path, data: data));
    return asJson(response.data);
  }

  Future<Json> uploadPhoto({
    required String incidentId,
    required String clientPhotoId,
    required String path,
  }) async {
    final file = File(path);
    if (!await file.exists()) {
      throw const AppException('A queued photo is no longer on this device.');
    }
    final mimeType = lookupMimeType(path) ?? 'image/jpeg';
    final form = FormData.fromMap({
      'clientPhotoId': clientPhotoId,
      'file': await MultipartFile.fromFile(
        path,
        filename: file.uri.pathSegments.last,
        contentType: DioMediaType.parse(mimeType),
      ),
    });
    final response = await _request(
      () => dio.post('/api/incidents/$incidentId/photos', data: form),
    );
    return asJson(response.data);
  }

  Future<Response<dynamic>> _request(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      return await request();
    } on DioException catch (error) {
      final body = asJson(error.response?.data);
      final message = stringValue(
        body,
        ['error', 'message'],
        error.response?.statusCode == 401
            ? 'Your session has expired. Please sign in again.'
            : 'Unable to reach the SanAntonioSafe server.',
      );
      throw AppException(message, details: body['details']);
    }
  }
}
