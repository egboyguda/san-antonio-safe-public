import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/alert_detail_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/incident_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/report_incident_screen.dart';
import 'screens/session_gate.dart';

final routerProvider = Provider<GoRouter>(
  (ref) => GoRouter(
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SessionGate()),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/report/new',
        builder: (context, state) => const ReportIncidentScreen(),
      ),
      GoRoute(
        path: '/report/:id',
        builder: (context, state) =>
            IncidentDetailScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/alert/:id',
        builder: (context, state) => AlertDetailScreen(
          id: state.pathParameters['id']!,
          notification: state.uri.queryParameters['notification'] == 'true',
        ),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    ],
  ),
);
