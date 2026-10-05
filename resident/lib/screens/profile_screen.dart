import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app_controller.dart';
import '../data/models.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key, this.isCompletion = false});
  final bool isCompletion;

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _mobile;
  late final TextEditingController _address;
  late final TextEditingController _contactName;
  late final TextEditingController _contactNumber;
  String? _barangayId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(appControllerProvider).profile;
    _name = TextEditingController(text: profile?.name);
    _mobile = TextEditingController(text: profile?.mobileNumber);
    _address = TextEditingController(text: profile?.address);
    _contactName = TextEditingController(text: profile?.emergencyContactName);
    _contactNumber = TextEditingController(
      text: profile?.emergencyContactNumber,
    );
    _barangayId = profile?.barangayId;
  }

  @override
  void dispose() {
    _name.dispose();
    _mobile.dispose();
    _address.dispose();
    _contactName.dispose();
    _contactNumber.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final profile = state.profile;
    final barangays = state.references.barangays;
    final hasSelected = barangays.any((item) => item.id == _barangayId);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.isCompletion,
        title: Text(widget.isCompletion ? 'Complete your profile' : 'Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.isCompletion) ...[
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Your barangay and mobile number help responders locate and contact you.',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name'),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                initialValue: profile?.email ?? '',
                enabled: false,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _mobile,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile number',
                  prefixText: '+63 ',
                ),
                validator: (value) =>
                    (value?.replaceAll(' ', '').length ?? 0) >= 10
                    ? null
                    : 'Enter a valid mobile number.',
              ),
              const SizedBox(height: 12),
              if (barangays.isNotEmpty)
                DropdownButtonFormField<String>(
                  initialValue: hasSelected ? _barangayId : null,
                  decoration: const InputDecoration(labelText: 'Barangay'),
                  items: barangays
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text(item.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _barangayId = value),
                  validator: (value) => value == null || value.isEmpty
                      ? 'Select a barangay.'
                      : null,
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
                decoration: const InputDecoration(labelText: 'Home address'),
                maxLines: 2,
                validator: _required,
              ),
              const SizedBox(height: 20),
              Text(
                'Emergency contact',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _contactName,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Contact name'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _contactNumber,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Contact number'),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _saving
                    ? null
                    : () async {
                        if (!_formKey.currentState!.validate()) return;
                        setState(() => _saving = true);
                        await ref
                            .read(appControllerProvider.notifier)
                            .saveProfile(
                              ResidentProfile(
                                id: profile?.id ?? '',
                                name: _name.text.trim(),
                                email: profile?.email ?? '',
                                mobileNumber: _mobile.text.trim(),
                                barangayId: _barangayId ?? '',
                                address: _address.text.trim(),
                                emergencyContactName: _contactName.text.trim(),
                                emergencyContactNumber: _contactNumber.text
                                    .trim(),
                              ),
                            );
                        if (!context.mounted) return;
                        setState(() => _saving = false);
                        if (!widget.isCompletion) context.pop();
                      },
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(widget.isCompletion ? 'Continue' : 'Save profile'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'This field is required.' : null;
}
