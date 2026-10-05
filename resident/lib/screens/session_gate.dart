import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app_controller.dart';
import 'onboarding_screen.dart';
import 'auth/login_screen.dart';
import 'profile_screen.dart';
import 'shell_screen.dart';

class SessionGate extends ConsumerWidget {
  const SessionGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(appControllerProvider);
    switch (state.onboardingStatus) {
      case OnboardingStatus.checking:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case OnboardingStatus.required:
        return OnboardingScreen(
          onComplete: ref
              .read(appControllerProvider.notifier)
              .completeOnboarding,
        );
      case OnboardingStatus.completed:
        break;
    }
    switch (state.sessionStatus) {
      case SessionStatus.booting:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case SessionStatus.signedOut:
        return const LoginScreen();
      case SessionStatus.signedIn:
        if (state.profile?.needsCompletion == true) {
          return const ProfileScreen(isCompletion: true);
        }
        return const AppShell();
    }
  }
}
