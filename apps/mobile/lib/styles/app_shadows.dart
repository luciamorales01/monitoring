import 'package:flutter/material.dart';

import 'app_colors.dart';

class AppShadows {
  static List<BoxShadow> soft = [
    BoxShadow(
      color: AppColors.text.withValues(alpha: 0.03),
      blurRadius: 24,
      offset: const Offset(0, 10),
      spreadRadius: -8,
    ),
  ];

  static List<BoxShadow> floating = [
    BoxShadow(
      color: AppColors.text.withValues(alpha: 0.05),
      blurRadius: 28,
      offset: const Offset(0, 14),
      spreadRadius: -10,
    ),
    BoxShadow(
      color: Colors.white.withValues(alpha: 0.75),
      blurRadius: 8,
      offset: const Offset(0, -1),
      spreadRadius: -5,
    ),
  ];
}
