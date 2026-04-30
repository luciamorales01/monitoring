import 'package:flutter/material.dart';

import 'app_colors.dart';

class AppShadows {
  static List<BoxShadow> soft = [
    BoxShadow(
      color: AppColors.text.withOpacity(0.04),
      blurRadius: 30,
      offset: const Offset(0, 12),
    ),
    BoxShadow(
      color: AppColors.primary.withOpacity(0.04),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> floating = [
    BoxShadow(
      color: AppColors.text.withOpacity(0.05),
      blurRadius: 40,
      offset: const Offset(0, 18),
    ),
    BoxShadow(
      color: Colors.white.withOpacity(0.65),
      blurRadius: 10,
      offset: const Offset(0, -2),
      spreadRadius: -4,
    ),
  ];
}
