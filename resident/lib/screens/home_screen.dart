import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../app_controller.dart';
import '../core/app_theme.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    final latestAlert = state.alerts.firstOrNull;
    final latestReport = state.incidents.firstOrNull;
    ref.listen(appControllerProvider.select((value) => value.message), (
      previous,
      next,
    ) {
      if (next != null && next != previous) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(next)));
        ref.read(appControllerProvider.notifier).clearMessage();
      }
    });

    return RefreshIndicator(
      onRefresh: () => ref.read(appControllerProvider.notifier).refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          _ConnectionBanner(
            online: state.isOnline,
            syncing: state.isSyncing,
            pending: state.pendingCount,
            onSync: () => ref.read(appControllerProvider.notifier).sync(),
          ),
          const SizedBox(height: 18),
          Text(
            'Hello, ${state.profile?.name.split(' ').firstOrNull ?? 'Resident'}',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text('Help and local safety updates are one tap away.'),
          const SizedBox(height: 20),
          Semantics(
            button: true,
            label: 'Send emergency SOS now',
            child: SizedBox(
              height: 116,
              child: ElevatedButton(
                onPressed: state.isBusy
                    ? null
                    : () => ref.read(appControllerProvider.notifier).sendSos(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.danger,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    state.isBusy
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Icon(Icons.sos, size: 42),
                    const SizedBox(height: 4),
                    const Text(
                      'SEND EMERGENCY SOS',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.push('/report/new'),
            icon: const Icon(Icons.add_a_photo_outlined),
            label: const Text('Report an incident'),
          ),
          const SizedBox(height: 24),
          const _SectionTitle(title: 'Latest alert', icon: Icons.warning_amber),
          const SizedBox(height: 8),
          if (latestAlert == null)
            const _EmptyCard(text: 'No safety alerts received.')
          else
            Card(
              child: InkWell(
                onTap: () => context.push('/alert/${latestAlert.id}'),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              latestAlert.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          _SeverityBadge(latestAlert.severity),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        latestAlert.message,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 20),
          const _SectionTitle(
            title: 'Recent report',
            icon: Icons.assignment_outlined,
          ),
          const SizedBox(height: 8),
          if (latestReport == null)
            const _EmptyCard(text: 'You have not submitted a report yet.')
          else
            Card(
              child: ListTile(
                onTap: () =>
                    context.push('/report/${latestReport.clientReportId}'),
                leading: const CircleAvatar(child: Icon(Icons.report_outlined)),
                title: Text(latestReport.title),
                subtitle: Text(
                  '${DateFormat.MMMd().add_jm().format(latestReport.createdAt)} | ${latestReport.status}',
                ),
                trailing: const Icon(Icons.chevron_right),
              ),
            ),
        ],
      ),
    );
  }
}

class _ConnectionBanner extends StatelessWidget {
  const _ConnectionBanner({
    required this.online,
    required this.syncing,
    required this.pending,
    required this.onSync,
  });
  final bool online;
  final bool syncing;
  final int pending;
  final VoidCallback onSync;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(
        color: online ? const Color(0xFFE8F5F0) : const Color(0xFFFFF1E7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            online ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
            size: 20,
            color: online ? AppTheme.success : AppTheme.warning,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              online
                  ? syncing
                        ? 'Syncing safety data'
                        : pending == 0
                        ? 'Up to date'
                        : '$pending item(s) waiting to sync'
                  : 'Offline | reports stay queued',
            ),
          ),
          IconButton(
            tooltip: 'Sync now',
            onPressed: syncing ? null : onSync,
            icon: syncing
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.icon});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 20),
      const SizedBox(width: 8),
      Text(
        title,
        style: Theme.of(
          context,
        ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
      ),
    ],
  );
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(16), child: Text(text)),
  );
}

class _SeverityBadge extends StatelessWidget {
  const _SeverityBadge(this.value);
  final String value;
  @override
  Widget build(BuildContext context) {
    final color = switch (value.toLowerCase()) {
      'critical' => AppTheme.danger,
      'high' => AppTheme.warning,
      _ => AppTheme.success,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        value.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
