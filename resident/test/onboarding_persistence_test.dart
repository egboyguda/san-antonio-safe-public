import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:san_antonio_safe/data/app_database.dart';
import 'package:san_antonio_safe/data/app_repository.dart';

void main() {
  test('onboarding completion persists in the local Drift cache', () async {
    final database = AppDatabase.forTesting(NativeDatabase.memory());
    final repository = AppRepository(database: database);
    addTearDown(database.close);

    expect(await repository.isOnboardingComplete(), isFalse);

    await repository.completeOnboarding();

    expect(await repository.isOnboardingComplete(), isTrue);
  });
}
