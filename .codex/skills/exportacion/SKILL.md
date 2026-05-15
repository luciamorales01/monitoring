SKILL: Mejorar informes de Monitoring

Cuando trabaje sobre informes PDF, XLSX o CSV del proyecto Monitoring, debe seguir estas reglas:

1. Prioridad visual:
   - El PDF debe parecer un informe profesional SaaS.
   - Usar portada, resumen ejecutivo, métricas destacadas, tablas limpias, colores por estado y footer.
   - Evitar informes en texto plano.

2. Estructura mínima del PDF:
   - Portada
   - Resumen ejecutivo
   - Métricas globales
   - Tabla de monitores
   - Detalle por monitor
   - Incidencias
   - Conclusiones automáticas
   - Footer con paginación

3. Estados:
   - UP: verde
   - DOWN: rojo
   - PAUSED: amarillo
   - UNKNOWN: gris

4. Métricas importantes:
   - SLA / uptime
   - tiempo medio de respuesta
   - downtime estimado
   - número de checks
   - número de incidencias
   - estado actual
   - peor monitor por SLA
   - monitor más lento

5. XLSX:
   - Debe tener varias hojas:
     - Resumen
     - Monitores
     - Incidencias
   - Debe incluir autofiltros, cabeceras con estilo, columnas autoajustadas y colores por estado.

6. CSV:
   - Debe mantenerse simple, limpio y compatible.
   - No intentar aplicar estilos.
   - Usar nombres de columnas claros.

7. Código:
   - Separar lógica de cálculo, formateo y generación.
   - No duplicar código entre PDF, XLSX y CSV.
   - Mantener TypeScript estricto.
   - No romper endpoints existentes.
   - No modificar la lógica de monitorización.

8. Resultado:
   - El informe debe servir tanto para usuarios reales como para presentar el TFG.