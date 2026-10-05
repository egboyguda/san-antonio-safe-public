import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../app_controller.dart';
import '../core/app_config.dart';
import '../core/app_theme.dart';
import '../data/models.dart';

class ReportIncidentScreen extends ConsumerStatefulWidget {
  const ReportIncidentScreen({super.key});

  @override
  ConsumerState<ReportIncidentScreen> createState() =>
      _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends ConsumerState<ReportIncidentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _address = TextEditingController();
  final _mapController = MapController();
  final _picker = ImagePicker();
  final _uuid = const Uuid();

  String? _categoryId;
  String? _barangayId;
  String _severity = 'moderate';
  double? _latitude;
  double? _longitude;
  double? _accuracy;
  final List<String> _photoPaths = [];
  bool _locating = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final state = ref.read(appControllerProvider);
    _barangayId = state.profile?.barangayId;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _address.dispose();
    _mapController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final categories = state.references.categories.isEmpty
        ? _fallbackCategories
        : state.references.categories;
    final selectedCategory = categories.any((item) => item.id == _categoryId)
        ? _categoryId
        : null;
    final barangays = state.references.barangays;
    final selectedBarangay = barangays.any((item) => item.id == _barangayId)
        ? _barangayId
        : null;
    final center = LatLng(_latitude ?? 12.412, _longitude ?? 124.279);

    return Scaffold(
      appBar: AppBar(title: const Text('Report an incident')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            DropdownButtonFormField<String>(
              initialValue: selectedCategory,
              decoration: const InputDecoration(
                labelText: 'Incident category',
                prefixIcon: Icon(Icons.category_outlined),
              ),
              items: categories
                  .where((item) => item.id != 'sos')
                  .map(
                    (item) => DropdownMenuItem(
                      value: item.id,
                      child: Text(item.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => _categoryId = value,
              validator: (value) =>
                  value == null ? 'Select an incident category.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Short title'),
              validator: (value) => (value?.trim().length ?? 0) >= 3
                  ? null
                  : 'Describe the incident briefly.',
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              textCapitalization: TextCapitalization.sentences,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'What is happening?',
                alignLabelWithHint: true,
              ),
              validator: (value) => (value?.trim().length ?? 0) >= 10
                  ? null
                  : 'Add at least 10 characters.',
            ),
            const SizedBox(height: 18),
            Text(
              'Severity',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'low', label: Text('Low')),
                  ButtonSegment(value: 'moderate', label: Text('Moderate')),
                  ButtonSegment(value: 'high', label: Text('High')),
                  ButtonSegment(value: 'critical', label: Text('Critical')),
                ],
                selected: {_severity},
                onSelectionChanged: (values) =>
                    setState(() => _severity = values.first),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Incident location',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: _locating ? null : _captureLocation,
                  icon: _locating
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location),
                  label: const Text('Use GPS'),
                ),
              ],
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                height: 230,
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: 14,
                    onTap: (_, point) => setState(() {
                      _latitude = point.latitude;
                      _longitude = point.longitude;
                      _accuracy = null;
                    }),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.sanantoniosafe.resident',
                    ),
                    if (_latitude != null && _longitude != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(_latitude!, _longitude!),
                            width: 44,
                            height: 44,
                            child: const Icon(
                              Icons.location_pin,
                              color: AppTheme.danger,
                              size: 42,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tap the map to move the incident marker.',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 12),
            if (barangays.isNotEmpty)
              DropdownButtonFormField<String>(
                initialValue: selectedBarangay,
                decoration: const InputDecoration(labelText: 'Barangay'),
                items: barangays
                    .map(
                      (item) => DropdownMenuItem(
                        value: item.id,
                        child: Text(item.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) => _barangayId = value,
                validator: (value) =>
                    value == null ? 'Select a barangay.' : null,
              )
            else
              TextFormField(
                initialValue: _barangayId,
                decoration: const InputDecoration(labelText: 'Barangay ID'),
                onChanged: (value) => _barangayId = value,
                validator: _required,
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Nearby landmark or address',
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Photos',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Take photo',
                  onPressed: () => _pickPhoto(ImageSource.camera),
                  icon: const Icon(Icons.photo_camera_outlined),
                ),
                IconButton(
                  tooltip: 'Choose photo',
                  onPressed: () => _pickPhoto(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined),
                ),
              ],
            ),
            if (_photoPaths.isNotEmpty)
              SizedBox(
                height: 92,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _photoPaths.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) => Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.file(
                          File(_photoPaths[index]),
                          width: 92,
                          height: 92,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        right: 2,
                        top: 2,
                        child: IconButton.filled(
                          tooltip: 'Remove photo',
                          visualDensity: VisualDensity.compact,
                          onPressed: () =>
                              setState(() => _photoPaths.removeAt(index)),
                          icon: const Icon(Icons.close, size: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger)),
            ],
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send),
              label: const Text('Submit report'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _captureLocation() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const AppException('Turn on location services to use GPS.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw const AppException(
          'Location permission was denied. Tap the map or use your barangay.',
        );
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _accuracy = position.accuracy;
      });
      _mapController.move(LatLng(position.latitude, position.longitude), 16);
    } on AppException catch (error) {
      setState(() => _error = error.message);
    } catch (_) {
      setState(() => _error = 'Unable to capture GPS. Tap the map instead.');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _pickPhoto(ImageSource source) async {
    setState(() => _error = null);
    final picked = await _picker.pickImage(
      source: source,
      imageQuality: 82,
      maxWidth: 1920,
      maxHeight: 1920,
      requestFullMetadata: false,
    );
    if (picked == null) return;
    final sourceFile = File(picked.path);
    if (await sourceFile.length() > AppConfig.maxPhotoBytes) {
      setState(() => _error = 'Photo must be smaller than 5 MB.');
      return;
    }
    final extension = p.extension(picked.path).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].contains(extension)) {
      setState(() => _error = 'Use a JPEG, PNG, or WebP photo.');
      return;
    }
    final documents = await getApplicationDocumentsDirectory();
    final folder = Directory(p.join(documents.path, 'incident_photos'));
    await folder.create(recursive: true);
    final saved = await sourceFile.copy(
      p.join(folder.path, _uuid.v4() + extension),
    );
    if (mounted) setState(() => _photoPaths.add(saved.path));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_latitude == null || _longitude == null) {
      setState(() {
        _error = 'Tap the map or use GPS to set the incident location.';
      });
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    await ref
        .read(appControllerProvider.notifier)
        .submitIncident(
          categoryId: _categoryId!,
          title: _title.text.trim(),
          description: _description.text.trim(),
          severity: _severity,
          barangayId: _barangayId ?? '',
          latitude: _latitude,
          longitude: _longitude,
          accuracy: _accuracy,
          approximateAddress: _address.text.trim(),
          photoPaths: _photoPaths,
        );
    if (mounted) context.pop();
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'This field is required.' : null;

  static const _fallbackCategories = [
    ReferenceItem(id: 'fire', name: 'Fire'),
    ReferenceItem(id: 'flood', name: 'Flood'),
    ReferenceItem(id: 'accident', name: 'Accident'),
    ReferenceItem(id: 'medical', name: 'Medical emergency'),
    ReferenceItem(id: 'crime-public-safety', name: 'Public safety'),
    ReferenceItem(id: 'typhoon', name: 'Typhoon related'),
    ReferenceItem(id: 'other', name: 'Other emergency'),
  ];
}
