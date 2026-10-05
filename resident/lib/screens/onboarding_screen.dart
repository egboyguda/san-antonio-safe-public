import 'package:flutter/material.dart';

import '../core/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onComplete});

  final Future<void> Function() onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;
  bool _finishing = false;

  static const _slides = [
    _OnboardingSlide(
      icon: Icons.sos,
      accent: AppTheme.danger,
      title: 'Emergency help, one tap away',
      body:
          'Send an immediate SOS with your location, last known position, or saved barangay so responders have a starting point.',
      highlights: [
        (Icons.location_on_outlined, 'Location-aware SOS'),
        (Icons.person_pin_circle_outlined, 'Profile area fallback'),
      ],
    ),
    _OnboardingSlide(
      icon: Icons.add_a_photo_outlined,
      accent: AppTheme.warning,
      title: 'Report what is happening',
      body:
          'Share the incident category, severity, map location, nearby landmark, and photos that help responders understand the situation.',
      highlights: [
        (Icons.map_outlined, 'Editable incident map'),
        (Icons.photo_camera_outlined, 'Photo evidence'),
      ],
    ),
    _OnboardingSlide(
      icon: Icons.notifications_active_outlined,
      accent: Color(0xFF2767A8),
      title: 'Follow local safety updates',
      body:
          'Receive community alerts and notifications, then follow your report from pending through active response and resolution.',
      highlights: [
        (Icons.warning_amber, 'Community alerts'),
        (Icons.timeline_outlined, 'Response status'),
      ],
    ),
    _OnboardingSlide(
      icon: Icons.health_and_safety_outlined,
      accent: AppTheme.success,
      title: 'Stay ready, even offline',
      body:
          'Reports remain queued without a connection. Emergency contacts and evacuation center information stay close at hand.',
      highlights: [
        (Icons.cloud_off_outlined, 'Offline report queue'),
        (Icons.home_work_outlined, 'Local safety directory'),
      ],
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _page == _slides.length - 1;
    return PopScope(
      canPop: _page == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _page > 0) _previous();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.health_and_safety,
                      color: AppTheme.success,
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'SanAntonioSafe',
                        style: TextStyle(
                          color: AppTheme.ink,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Text(
                      '${_page + 1} of ${_slides.length}',
                      style: const TextStyle(
                        color: Color(0xFF667680),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _slides.length,
                  onPageChanged: (value) => setState(() => _page = value),
                  itemBuilder: (context, index) =>
                      _SlideContent(slide: _slides[index]),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _slides.length,
                  (index) => Semantics(
                    label: 'Overview page ${index + 1}',
                    selected: index == _page,
                    child: AnimatedContainer(
                      key: ValueKey('onboarding-dot-$index'),
                      duration: const Duration(milliseconds: 180),
                      width: index == _page ? 24 : 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: index == _page
                            ? _slides[_page].accent
                            : const Color(0xFFD6DEE2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                child: Row(
                  children: [
                    SizedBox(
                      width: 112,
                      child: _page == 0
                          ? const SizedBox.shrink()
                          : OutlinedButton.icon(
                              onPressed: _finishing ? null : _previous,
                              icon: const Icon(Icons.arrow_back),
                              label: const Text('Back'),
                            ),
                    ),
                    const Spacer(),
                    SizedBox(
                      width: 164,
                      child: ElevatedButton.icon(
                        onPressed: _finishing
                            ? null
                            : isLast
                            ? _finish
                            : _next,
                        icon: _finishing
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Icon(isLast ? Icons.check : Icons.arrow_forward),
                        label: Text(isLast ? 'Get Started' : 'Next'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _next() {
    _controller.nextPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  void _previous() {
    _controller.previousPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _finish() async {
    setState(() => _finishing = true);
    try {
      await widget.onComplete();
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }
}

class _SlideContent extends StatelessWidget {
  const _SlideContent({required this.slide});

  final _OnboardingSlide slide;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(28, 28, 28, 20),
      child: Column(
        children: [
          Container(
            width: 164,
            height: 164,
            decoration: BoxDecoration(
              color: slide.accent.withValues(alpha: .12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(slide.icon, size: 80, color: slide.accent),
          ),
          const SizedBox(height: 34),
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppTheme.ink,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Text(
              slide.body,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF52616A),
                fontSize: 16,
                height: 1.45,
              ),
            ),
          ),
          const SizedBox(height: 28),
          ...slide.highlights.map(
            (highlight) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(highlight.$1, color: slide.accent, size: 22),
                  const SizedBox(width: 10),
                  Text(
                    highlight.$2,
                    style: const TextStyle(
                      color: AppTheme.ink,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingSlide {
  const _OnboardingSlide({
    required this.icon,
    required this.accent,
    required this.title,
    required this.body,
    required this.highlights,
  });

  final IconData icon;
  final Color accent;
  final String title;
  final String body;
  final List<(IconData, String)> highlights;
}
