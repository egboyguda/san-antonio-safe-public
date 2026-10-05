import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../app_controller.dart';
import '../core/app_theme.dart';
import '../data/models.dart';

class IncidentDetailScreen extends ConsumerWidget {
  const IncidentDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incidents = ref.watch(
      appControllerProvider.select((state) => state.incidents),
    );
    IncidentRecord? incident;
    for (final item in incidents) {
      if (item.clientReportId == id || item.serverId == id) incident = item;
    }
    if (incident == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Report details')),
        body: const Center(child: Text('This report is not available.')),
      );
    }
    final report = incident;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report details'),
        actions: [
          if (report.status == 'pending')
            IconButton(
              tooltip: 'Edit pending report',
              onPressed: () => _edit(context, ref, report),
              icon: const Icon(Icons.edit_outlined),
            ),
          if (report.serverId == null)
            IconButton(
              tooltip: 'Delete local report',
              onPressed: () => _delete(context, ref, report),
              icon: const Icon(Icons.delete_outline),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  report.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              _StatusBadge(report.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(DateFormat.yMMMd().add_jm().format(report.createdAt)),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(report.description),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Response progress',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          _StatusTimeline(current: report.status),
          if (report.remarks.isNotEmpty) ...[
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.message_outlined),
                title: const Text('Responder remarks'),
                subtitle: Text(report.remarks),
              ),
            ),
          ],
          if (report.latitude != null && report.longitude != null) ...[
            const SizedBox(height: 20),
            Text(
              'Reported location',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                height: 210,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: LatLng(report.latitude!, report.longitude!),
                    initialZoom: 16,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.sanantoniosafe.resident',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(report.latitude!, report.longitude!),
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
          ],
          if (report.photoPaths.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'Attached photos',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: report.photoPaths
                  .where((path) => File(path).existsSync())
                  .map(
                    (path) => ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.file(
                        File(path),
                        width: 112,
                        height: 112,
                        fit: BoxFit.cover,
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 20),
          _SyncCard(report),
          if (report.syncState == LocalSyncState.failed ||
              report.syncState == LocalSyncState.rejected) ...[
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () => ref
                  .read(appControllerProvider.notifier)
                  .retryIncident(report.clientReportId),
              icon: const Icon(Icons.sync),
              label: const Text('Retry sync'),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _delete(
    BuildContext context,
    WidgetRef ref,
    IncidentRecord incident,
  ) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete pending report?'),
        content: const Text(
          'This removes the report from this device and cancels its queued sync.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (accepted != true) return;
    final deleted = await ref
        .read(appControllerProvider.notifier)
        .deleteLocalIncident(incident);
    if (deleted && context.mounted) Navigator.pop(context);
  }

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref,
    IncidentRecord incident,
  ) async {
    final title = TextEditingController(text: incident.title);
    final description = TextEditingController(text: incident.description);
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit pending report'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: title,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: description,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (accepted == true &&
        title.text.trim().length >= 3 &&
        description.text.trim().length >= 10) {
      await ref
          .read(appControllerProvider.notifier)
          .updateIncidentDetails(incident, title.text, description.text);
    }
    title.dispose();
    description.dispose();
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge(this.status);
  final String status;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: AppTheme.success.withValues(alpha: .12),
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(
      status.toUpperCase(),
      style: const TextStyle(
        color: AppTheme.success,
        fontSize: 11,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.current});
  final String current;
  static const statuses = [
    'pending',
    'verified',
    'assigned',
    'responding',
    'resolved',
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = statuses.indexOf(current);
    return Row(
      children: [
        for (var index = 0; index < statuses.length; index++) ...[
          Expanded(
            child: Column(
              children: [
                Icon(
                  index <= currentIndex
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: index <= currentIndex ? AppTheme.success : Colors.grey,
                ),
                const SizedBox(height: 4),
                FittedBox(
                  child: Text(
                    statuses[index],
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
          if (index < statuses.length - 1)
            Container(
              width: 10,
              height: 2,
              color: index < currentIndex ? AppTheme.success : Colors.grey,
            ),
        ],
      ],
    );
  }
}

class _SyncCard extends StatelessWidget {
  const _SyncCard(this.report);
  final IncidentRecord report;
  @override
  Widget build(BuildContext context) {
    final label = switch (report.syncState) {
      LocalSyncState.synced => 'Saved on the server',
      LocalSyncState.queued => 'Queued on this device',
      LocalSyncState.uploading => 'Uploading evidence',
      LocalSyncState.failed => 'Sync retry pending',
      LocalSyncState.rejected => 'Server rejected this report',
    };
    return Card(
      child: ListTile(
        leading: const Icon(Icons.cloud_outlined),
        title: Text(label),
        subtitle: report.syncError == null ? null : Text(report.syncError!),
      ),
    );
  }
}
