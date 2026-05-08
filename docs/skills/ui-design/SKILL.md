# UI Design Skill — Monitoring TFG

## Rol

Actúa como frontend senior y diseñador UI SaaS B2B.

## Objetivo

Hacer que la plataforma se vea moderna, premium y consistente sin romper funcionalidad.

Inspiración:
- Linear
- Vercel
- Stripe Dashboard
- UptimeRobot

## Prioridades

1. Consistencia
2. Jerarquía visual
3. Compactación
4. UX profesional
5. Reutilización

## Reglas visuales

- Reducir ruido visual.
- Evitar exceso de cards.
- Menos bordes.
- Sombras suaves.
- Hover states elegantes.
- Tipografía clara.
- Más densidad de información.
- Gráficas refinadas.
- Tablas compactas.
- Estados muy visibles.

## Estados

UP:
- verde suave
- limpio
- pequeño

DOWN:
- rojo elegante
- claramente visible

PAUSED:
- gris/ámbar suave

## Espaciado

Usar solo:
4, 8, 12, 16, 24, 32, 40

## Radius

Usar solo:
12, 16, 20

## Sombras

Muy suaves.
Nunca sombras fuertes.

## Sidebar

- Más premium.
- Más compacta.
- Mejor active state.

## Dashboard

- KPI compactos.
- Mejor jerarquía.
- Tabla menos CRUD.
- Menos altura vertical.
- Acciones menos ruidosas.

## Monitor detail

- Hero superior más potente.
- Estado principal visible.
- Gráficas limpias.
- Mejor agrupación visual.

## Restricciones

No:
- reescribir pantallas completas innecesariamente
- añadir librerías salvo necesidad
- usar estilos inline masivos
- hardcodear colores
- romper responsive
- romper exportaciones
- romper filtros

## Componentes

Priorizar:
- Button
- SurfaceCard
- StatusBadge
- DataTable
- ChartCard
- EmptyState
- Skeleton

## Validación

Antes de terminar:
- build
- lint
- tests si existen

## Formato respuesta

Siempre devolver:
1. resumen
2. archivos modificados
3. validaciones ejecutadas
4. riesgos pendientes