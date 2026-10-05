import 'dart:convert';

typedef Json = Map<String, dynamic>;

Json asJson(dynamic value) => value is Map
    ? value.map((key, value) => MapEntry(key.toString(), value))
    : <String, dynamic>{};

List<Json> jsonList(dynamic value) {
  if (value is Map && value['data'] is List) value = value['data'];
  if (value is Map && value['items'] is List) value = value['items'];
  return value is List ? value.map(asJson).toList() : const [];
}

String stringValue(Json json, List<String> keys, [String fallback = '']) {
  for (final key in keys) {
    final value = json[key];
    if (value != null && value.toString().isNotEmpty) return value.toString();
  }
  return fallback;
}

DateTime? dateValue(dynamic value) =>
    value == null ? null : DateTime.tryParse(value.toString())?.toLocal();

double? doubleValue(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse(value?.toString() ?? '');

String normalizeIncidentCategoryId(String value) => switch (value) {
  'sos' => 'other',
  'public-safety' => 'crime-public-safety',
  _ => value,
};

class ResidentProfile {
  const ResidentProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.mobileNumber,
    required this.barangayId,
    required this.address,
    required this.emergencyContactName,
    required this.emergencyContactNumber,
  });

  final String id;
  final String name;
  final String email;
  final String mobileNumber;
  final String barangayId;
  final String address;
  final String emergencyContactName;
  final String emergencyContactNumber;

  bool get needsCompletion => mobileNumber.isEmpty || barangayId.isEmpty;

  factory ResidentProfile.fromJson(Json source) {
    final data = asJson(source['data']);
    if (data.isNotEmpty) source = data;
    final profile = asJson(source['profile']);
    final json = profile.isEmpty ? source : profile;
    final user = asJson(source['user']);
    return ResidentProfile(
      id: stringValue(json, ['id', 'userId'], stringValue(user, ['id'])),
      name: stringValue(json, [
        'name',
        'fullName',
      ], stringValue(user, ['name'])),
      email: stringValue(json, ['email'], stringValue(user, ['email'])),
      mobileNumber: stringValue(json, ['mobileNumber', 'phone']),
      barangayId: stringValue(json, ['barangayId']),
      address: stringValue(json, ['address']),
      emergencyContactName: stringValue(json, ['emergencyContactName']),
      emergencyContactNumber: stringValue(json, ['emergencyContactNumber']),
    );
  }

  Json toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'mobileNumber': mobileNumber,
    'barangayId': barangayId,
    'address': address,
    'emergencyContactName': emergencyContactName,
    'emergencyContactNumber': emergencyContactNumber,
  };
}

class ReferenceItem {
  const ReferenceItem({
    required this.id,
    required this.name,
    this.data = const {},
  });
  final String id;
  final String name;
  final Json data;

  factory ReferenceItem.fromJson(Json json) => ReferenceItem(
    id: stringValue(json, ['id', 'value', 'code']),
    name: stringValue(json, ['name', 'label', 'title']),
    data: json,
  );
}

class ReferenceData {
  const ReferenceData({
    this.barangays = const [],
    this.categories = const [],
    this.contacts = const [],
    this.centers = const [],
  });

  final List<ReferenceItem> barangays;
  final List<ReferenceItem> categories;
  final List<ReferenceItem> contacts;
  final List<ReferenceItem> centers;

  factory ReferenceData.fromJson(Json source) {
    final nested = asJson(source['reference']);
    final json = nested.isEmpty ? source : nested;
    List<ReferenceItem> read(List<String> keys) {
      dynamic value;
      for (final key in keys) {
        if (json[key] != null) {
          value = json[key];
          break;
        }
      }
      return jsonList(value)
          .map(ReferenceItem.fromJson)
          .where((item) => item.id.isNotEmpty)
          .toList();
    }

    return ReferenceData(
      barangays: read(['barangays']),
      categories: read(['incidentCategories', 'categories']),
      contacts: read(['emergencyContacts', 'contacts']),
      centers: read(['evacuationCenters', 'centers']),
    );
  }

  Json toJson() => {
    'barangays': barangays.map((item) => item.data).toList(),
    'incidentCategories': categories.map((item) => item.data).toList(),
    'emergencyContacts': contacts.map((item) => item.data).toList(),
    'evacuationCenters': centers.map((item) => item.data).toList(),
  };
}

enum LocalSyncState { synced, queued, uploading, failed, rejected }

class IncidentRecord {
  const IncidentRecord({
    required this.clientReportId,
    this.serverId,
    required this.categoryId,
    required this.title,
    required this.description,
    required this.severity,
    required this.status,
    required this.barangayId,
    this.latitude,
    this.longitude,
    this.locationAccuracy,
    this.approximateAddress = '',
    required this.createdAt,
    this.updatedAt,
    this.remarks = '',
    this.photoPaths = const [],
    this.uploadedPhotoPaths = const [],
    this.syncState = LocalSyncState.synced,
    this.syncError,
  });

  final String clientReportId;
  final String? serverId;
  final String categoryId;
  final String title;
  final String description;
  final String severity;
  final String status;
  final String barangayId;
  final double? latitude;
  final double? longitude;
  final double? locationAccuracy;
  final String approximateAddress;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String remarks;
  final List<String> photoPaths;
  final List<String> uploadedPhotoPaths;
  final LocalSyncState syncState;
  final String? syncError;

  factory IncidentRecord.fromJson(Json json) {
    final clientId = stringValue(json, ['clientReportId', 'client_report_id']);
    final id = stringValue(json, ['id', 'serverId']);
    final syncName = json['localSyncState']?.toString();
    var syncState = LocalSyncState.synced;
    for (final candidate in LocalSyncState.values) {
      if (candidate.name == syncName) syncState = candidate;
    }
    return IncidentRecord(
      clientReportId: clientId.isEmpty ? id : clientId,
      serverId: id.isEmpty ? null : id,
      categoryId: stringValue(json, ['incidentCategoryId', 'categoryId']),
      title: stringValue(json, ['title'], 'Emergency report'),
      description: stringValue(json, ['description']),
      severity: stringValue(json, ['severityLevel', 'severity'], 'moderate'),
      status: stringValue(json, ['status'], 'pending'),
      barangayId: stringValue(json, ['barangayId']),
      latitude: doubleValue(json['latitude']),
      longitude: doubleValue(json['longitude']),
      locationAccuracy: doubleValue(json['locationAccuracy']),
      approximateAddress: stringValue(json, ['approximateAddress', 'address']),
      createdAt:
          dateValue(
            json['clientCreatedAt'] ?? json['createdAt'] ?? json['reportedAt'],
          ) ??
          DateTime.now(),
      updatedAt: dateValue(json['updatedAt']),
      remarks: stringValue(json, ['remarks', 'responderRemarks']),
      photoPaths:
          (json['photoPaths'] as List?)
              ?.map((item) => item.toString())
              .toList() ??
          const [],
      uploadedPhotoPaths:
          (json['uploadedPhotoPaths'] as List?)
              ?.map((item) => item.toString())
              .toList() ??
          const [],
      syncState: syncState,
      syncError: json['syncError']?.toString(),
    );
  }

  Json toApiJson() => {
    'clientReportId': clientReportId,
    'clientCreatedAt': createdAt.toUtc().toIso8601String(),
    'incidentCategoryId': normalizeIncidentCategoryId(categoryId),
    'title': title,
    'description': description,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
    if (locationAccuracy != null) 'locationAccuracy': locationAccuracy,
    if (approximateAddress.isNotEmpty) 'approximateAddress': approximateAddress,
    if (barangayId.isNotEmpty) 'barangayId': barangayId,
    'severityLevel': severity,
  };

  Json toJson() => {
    ...toApiJson(),
    if (serverId != null) 'serverId': serverId,
    'status': status,
    'updatedAt': updatedAt?.toUtc().toIso8601String(),
    'remarks': remarks,
    'photoPaths': photoPaths,
    'uploadedPhotoPaths': uploadedPhotoPaths,
    'localSyncState': syncState.name,
    'syncError': syncError,
  };

  IncidentRecord copyWith({
    String? serverId,
    String? categoryId,
    String? status,
    String? remarks,
    List<String>? uploadedPhotoPaths,
    LocalSyncState? syncState,
    String? syncError,
    bool clearError = false,
  }) => IncidentRecord(
    clientReportId: clientReportId,
    serverId: serverId ?? this.serverId,
    categoryId: categoryId ?? this.categoryId,
    title: title,
    description: description,
    severity: severity,
    status: status ?? this.status,
    barangayId: barangayId,
    latitude: latitude,
    longitude: longitude,
    locationAccuracy: locationAccuracy,
    approximateAddress: approximateAddress,
    createdAt: createdAt,
    updatedAt: DateTime.now(),
    remarks: remarks ?? this.remarks,
    photoPaths: photoPaths,
    uploadedPhotoPaths: uploadedPhotoPaths ?? this.uploadedPhotoPaths,
    syncState: syncState ?? this.syncState,
    syncError: clearError ? null : (syncError ?? this.syncError),
  );
}

class AlertRecord {
  const AlertRecord({
    required this.id,
    required this.title,
    required this.message,
    required this.severity,
    required this.createdAt,
    this.isRead = false,
  });
  final String id;
  final String title;
  final String message;
  final String severity;
  final DateTime createdAt;
  final bool isRead;

  factory AlertRecord.fromJson(Json json) => AlertRecord(
    id: stringValue(json, ['id']),
    title: stringValue(json, ['title'], 'Safety alert'),
    message: stringValue(json, ['message', 'body']),
    severity: stringValue(json, ['severityLevel', 'severity'], 'moderate'),
    createdAt: dateValue(json['sentAt'] ?? json['createdAt']) ?? DateTime.now(),
    isRead: json['isRead'] == true || json['readAt'] != null,
  );

  Json toJson() => {
    'id': id,
    'title': title,
    'message': message,
    'severityLevel': severity,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'isRead': isRead,
  };

  AlertRecord copyWith({bool? isRead}) => AlertRecord(
    id: id,
    title: title,
    message: message,
    severity: severity,
    createdAt: createdAt,
    isRead: isRead ?? this.isRead,
  );
}

class AppException implements Exception {
  const AppException(this.message, {this.details});
  final String message;
  final dynamic details;
  @override
  String toString() => message;
}

String encodeJson(dynamic value) => jsonEncode(value);
dynamic decodeJson(String value) => jsonDecode(value);
