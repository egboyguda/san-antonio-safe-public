import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../app_controller.dart';
import '../core/app_theme.dart';
import '../data/models.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          const Material(
            color: Colors.white,
            child: TabBar(
              tabs: [
                Tab(text: 'Community alerts'),
                Tab(text: 'Notifications'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _AlertList(items: state.alerts, notification: false),
                _AlertList(items: state.notifications, notification: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertList extends StatelessWidget {
  const _AlertList({required this.items, required this.notification});
  final List<AlertRecord> items;
  final bool notification;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Center(child: Text('Nothing new here.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final alert = items[index];
        return Card(
          child: ListTile(
            onTap: () =>
                context.push('/alert/${alert.id}?notification=$notification'),
            leading: CircleAvatar(
              backgroundColor: _color(alert.severity).withValues(alpha: .12),
              child: Icon(
                notification
                    ? Icons.notifications_outlined
                    : Icons.warning_amber,
                color: _color(alert.severity),
              ),
            ),
            title: Text(
              alert.title,
              style: TextStyle(
                fontWeight: alert.isRead ? FontWeight.w600 : FontWeight.w900,
              ),
            ),
            subtitle: Text(
              '${DateFormat.MMMd().add_jm().format(alert.createdAt)}\n${alert.message}',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            isThreeLine: true,
            trailing: alert.isRead
                ? null
                : const Icon(Icons.circle, size: 10, color: AppTheme.danger),
          ),
        );
      },
    );
  }

  Color _color(String severity) => switch (severity.toLowerCase()) {
    'critical' => AppTheme.danger,
    'high' => AppTheme.warning,
    _ => AppTheme.success,
  };
}
