import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app_controller.dart';
import '../data/models.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Card(
          child: ListTile(
            onTap: () => context.push('/profile'),
            leading: const Icon(Icons.person_outline),
            title: Text(state.profile?.name ?? 'Resident profile'),
            subtitle: const Text('Contact and household emergency details'),
            trailing: const Icon(Icons.chevron_right),
          ),
        ),
        const SizedBox(height: 20),
        const _Heading(
          icon: Icons.local_phone_outlined,
          title: 'Emergency contacts',
        ),
        const SizedBox(height: 8),
        if (state.references.contacts.isEmpty)
          const _InfoCard('Emergency contacts are not available offline yet.')
        else
          ...state.references.contacts.map(_contactTile),
        const SizedBox(height: 20),
        const _Heading(
          icon: Icons.apartment_outlined,
          title: 'Evacuation centers',
        ),
        const SizedBox(height: 8),
        if (state.references.centers.isEmpty)
          const _InfoCard('Evacuation centers are not available offline yet.')
        else
          ...state.references.centers.map(_centerTile),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () => ref.read(appControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout),
          label: const Text('Sign out'),
        ),
      ],
    );
  }

  Widget _contactTile(ReferenceItem item) {
    final phone = stringValue(item.data, [
      'phoneNumber',
      'contactNumber',
      'mobileNumber',
      'phone',
    ]);
    final detail = stringValue(item.data, [
      'description',
      'agency',
      'barangayName',
    ], phone);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        child: ListTile(
          leading: const CircleAvatar(child: Icon(Icons.phone_in_talk)),
          title: Text(item.name),
          subtitle: Text(detail),
          trailing: IconButton(
            tooltip: 'Call ${item.name}',
            onPressed: phone.isEmpty
                ? null
                : () => launchUrl(Uri(scheme: 'tel', path: phone)),
            icon: const Icon(Icons.call),
          ),
        ),
      ),
    );
  }

  Widget _centerTile(ReferenceItem item) {
    final address = stringValue(item.data, [
      'address',
      'barangayName',
      'location',
    ], 'San Antonio');
    final latitude = doubleValue(item.data['latitude']);
    final longitude = doubleValue(item.data['longitude']);
    final capacity = stringValue(item.data, ['capacity']);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Card(
        child: ListTile(
          leading: const CircleAvatar(child: Icon(Icons.home_work_outlined)),
          title: Text(item.name),
          subtitle: Text(
            capacity.isEmpty ? address : '$address\nCapacity: $capacity',
          ),
          isThreeLine: capacity.isNotEmpty,
          trailing: IconButton(
            tooltip: 'Open directions',
            onPressed: latitude == null || longitude == null
                ? null
                : () => launchUrl(
                    Uri.parse(
                      'geo:$latitude,$longitude?q=$latitude,$longitude',
                    ),
                    mode: LaunchMode.externalApplication,
                  ),
            icon: const Icon(Icons.directions),
          ),
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading({required this.icon, required this.title});
  final IconData icon;
  final String title;
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

class _InfoCard extends StatelessWidget {
  const _InfoCard(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: const EdgeInsets.all(16), child: Text(text)),
  );
}
