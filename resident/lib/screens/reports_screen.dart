import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../app_controller.dart';
import '../core/app_theme.dart';
import '../data/models.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incidents = ref.watch(
      appControllerProvider.select((state) => state.incidents),
    );
    if (incidents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.assignment_outlined, size: 48),
              const SizedBox(height: 12),
              const Text('No incident reports yet.'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => context.push('/report/new'),
                icon: const Icon(Icons.add),
                label: const Text('Create report'),
              ),
            ],
          ),
        ),
      );
    }
    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: () => ref.read(appControllerProvider.notifier).refresh(),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
            itemCount: incidents.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final incident = incidents[index];
              return Card(
                child: ListTile(
                  onTap: () =>
                      context.push('/report/${incident.clientReportId}'),
                  contentPadding: const EdgeInsets.all(14),
                  title: Text(
                    incident.title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '${DateFormat.MMMd().add_jm().format(incident.createdAt)}\n${incident.status.toUpperCase()} | ${_syncLabel(incident.syncState)}',
                    ),
                  ),
                  isThreeLine: true,
                  leading: Icon(
                    incident.syncState == LocalSyncState.failed ||
                            incident.syncState == LocalSyncState.rejected
                        ? Icons.sync_problem
                        : Icons.assignment_turned_in_outlined,
                    color: incident.severity == 'critical'
                        ? AppTheme.danger
                        : AppTheme.success,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                ),
              );
            },
          ),
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton(
            tooltip: 'Report incident',
            onPressed: () => context.push('/report/new'),
            child: const Icon(Icons.add),
          ),
        ),
      ],
    );
  }

  String _syncLabel(LocalSyncState state) => switch (state) {
    LocalSyncState.synced => 'Synced',
    LocalSyncState.queued => 'Queued',
    LocalSyncState.uploading => 'Uploading',
    LocalSyncState.failed => 'Retry pending',
    LocalSyncState.rejected => 'Needs changes',
  };
}
