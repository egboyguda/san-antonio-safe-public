import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:san_antonio_safe/app_controller.dart';
import 'package:san_antonio_safe/core/app_theme.dart';
import 'package:san_antonio_safe/data/models.dart';
import 'package:san_antonio_safe/screens/reports_screen.dart';
import 'package:san_antonio_safe/screens/onboarding_screen.dart';
import 'package:san_antonio_safe/screens/session_gate.dart';

void main() {
  testWidgets('report history shows local sync state', (tester) async {
    final incident = IncidentRecord(
      clientReportId: 'local-1',
      categoryId: 'fire',
      title: 'House fire',
      description: 'Smoke is visible from the road.',
      severity: 'critical',
      status: 'pending',
      barangayId: 'ward-1',
      createdAt: DateTime(2026, 7, 4),
      syncState: LocalSyncState.queued,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appControllerProvider.overrideWithBuild(
            (ref, notifier) => AppState(
              sessionStatus: SessionStatus.signedIn,
              incidents: [incident],
            ),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(body: ReportsScreen()),
        ),
      ),
    );

    expect(find.text('House fire'), findsOneWidget);
    expect(find.textContaining('Queued'), findsOneWidget);
    expect(find.byIcon(Icons.assignment_turned_in_outlined), findsOneWidget);
  });

  testWidgets('startup gate shows onboarding before login', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appControllerProvider.overrideWithBuild(
            (ref, notifier) => const AppState(
              onboardingStatus: OnboardingStatus.required,
              sessionStatus: SessionStatus.signedOut,
            ),
          ),
        ],
        child: MaterialApp(theme: AppTheme.light, home: const SessionGate()),
      ),
    );

    expect(find.text('Emergency help, one tap away'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
  });

  testWidgets('onboarding requires final Get Started action', (tester) async {
    var completions = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: OnboardingScreen(
          onComplete: () async {
            completions++;
          },
        ),
      ),
    );

    expect(find.text('Emergency help, one tap away'), findsOneWidget);
    expect(find.text('Get Started'), findsNothing);
    expect(
      tester
          .widget<AnimatedContainer>(
            find.byKey(const ValueKey('onboarding-dot-0')),
          )
          .constraints
          ?.maxWidth,
      24,
    );

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Report what is happening'), findsOneWidget);

    await tester.tap(find.text('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Emergency help, one tap away'), findsOneWidget);

    await tester.drag(find.byType(PageView), const Offset(-500, 0));
    await tester.pumpAndSettle();
    expect(find.text('Report what is happening'), findsOneWidget);

    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Stay ready, even offline'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);
    expect(completions, 0);

    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();
    expect(completions, 1);
  });
}
