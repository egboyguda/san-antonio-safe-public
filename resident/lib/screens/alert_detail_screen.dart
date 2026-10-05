import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../app_controller.dart';
import '../core/app_theme.dart';
import '../data/models.dart';

class AlertDetailScreen extends ConsumerStatefulWidget {
  const AlertDetailScreen({
    super.key,
    required this.id,
    required this.notification,
  });
  final String id;
  final bool notification;

  @override
  ConsumerState<AlertDetailScreen> createState() => _AlertDetailScreenState();
}

class _AlertDetailScreenState extends ConsumerState<AlertDetailScreen> {
  bool _marked = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final items = widget.notification ? state.notifications : state.alerts;
    AlertRecord? alert;
    for (final item in items) {
      if (item.id == widget.id) alert = item;
    }
    if (alert == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Safety update')),
        body: const Center(child: Text('This update is not available.')),
      );
    }
    if (!_marked && !alert.isRead) {
      _marked = true;
      final id = alert.id;
      Future.microtask(
        () => ref
            .read(appControllerProvider.notifier)
            .markAlertRead(id, notification: widget.notification),
      );
    }
    final record = alert;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.notification ? 'Notification' : 'Safety alert'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Icon(
            widget.notification
                ? Icons.notifications_active_outlined
                : Icons.warning_amber,
            size: 48,
            color: _color(record.severity),
          ),
          const SizedBox(height: 16),
          Text(
            record.title,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(DateFormat.yMMMMd().add_jm().format(record.createdAt)),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Text(
                record.message,
                style: const TextStyle(fontSize: 16, height: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _color(String severity) => switch (severity.toLowerCase()) {
    'critical' => AppTheme.danger,
    'high' => AppTheme.warning,
    _ => AppTheme.success,
  };
}
