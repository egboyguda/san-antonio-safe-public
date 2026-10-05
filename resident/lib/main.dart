import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workmanager/workmanager.dart';

import 'app_controller.dart';
import 'app_router.dart';
import 'core/app_config.dart';
import 'core/app_theme.dart';
import 'data/app_repository.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final result = await AppRepository().syncNow();
      return result.error == null;
    } catch (_) {
      return false;
    }
  });
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Platform.isAndroid || Platform.isIOS) {
    await Workmanager().initialize(callbackDispatcher);
  }
  runApp(const ProviderScope(child: SanAntonioSafeApp()));
}

class SanAntonioSafeApp extends ConsumerStatefulWidget {
  const SanAntonioSafeApp({super.key});

  @override
  ConsumerState<SanAntonioSafeApp> createState() => _SanAntonioSafeAppState();
}

class _SanAntonioSafeAppState extends ConsumerState<SanAntonioSafeApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(appControllerProvider.notifier).sync();
    }
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final isRequestingServer = ref.watch(
      appControllerProvider.select((state) => state.isRequestingServer),
    );
    return MaterialApp.router(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
      builder: (context, child) => Stack(
        fit: StackFit.expand,
        children: [
          child ?? const SizedBox.shrink(),
          if (isRequestingServer)
            Align(
              alignment: Alignment.topCenter,
              child: SafeArea(
                bottom: false,
                child: Semantics(
                  label: 'Contacting server',
                  child: const LinearProgressIndicator(minHeight: 3),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
