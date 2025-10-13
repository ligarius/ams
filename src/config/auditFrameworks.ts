export const AUDIT_FRAMEWORK_VALUES = ['SOX', 'ISO_27001', 'COBIT_2019', 'NIST_CSF'] as const;

export type AuditFrameworkId = (typeof AUDIT_FRAMEWORK_VALUES)[number];

export interface AuditFrameworkDefinition {
  id: AuditFrameworkId;
  label: string;
  description: string;
  checklist: readonly string[];
}

export const AUDIT_FRAMEWORKS: readonly AuditFrameworkDefinition[] = [
  {
    id: 'SOX',
    label: 'SOX (Sarbanes-Oxley)',
    description: 'Gobierno y control interno sobre reportes financieros conforme a la regulación estadounidense.',
    checklist: [
      'Definir alcance y procesos financieros críticos',
      'Documentar walkthroughs y pruebas de diseño de controles clave',
      'Ejecutar pruebas de efectividad operativa y remediaciones',
    ],
  },
  {
    id: 'ISO_27001',
    label: 'ISO 27001 (SGSI)',
    description: 'Sistema de gestión de seguridad de la información con foco en riesgos y controles del Anexo A.',
    checklist: [
      'Determinar alcance del SGSI y activos críticos',
      'Evaluar brechas frente a controles del Anexo A',
      'Definir plan de tratamiento de riesgos y acciones correctivas',
    ],
  },
  {
    id: 'COBIT_2019',
    label: 'COBIT 2019',
    description: 'Marco de gobierno y gestión de TI orientado a objetivos de valor, riesgo y recursos.',
    checklist: [
      'Mapear objetivos de gobierno y gestión relevantes',
      'Evaluar capacidad/madurez de procesos prioritarios',
      'Priorizar iniciativas de mejora y responsables',
    ],
  },
  {
    id: 'NIST_CSF',
    label: 'NIST Cybersecurity Framework',
    description: 'Marco de ciberseguridad con énfasis en las funciones Identificar, Proteger, Detectar, Responder y Recuperar.',
    checklist: [
      'Inventariar activos y evaluar riesgos de ciberseguridad',
      'Medir madurez por función del marco NIST CSF',
      'Definir plan de respuesta y mejora continua',
    ],
  },
] as const;

export const AUDIT_FRAMEWORK_DEFINITIONS: Record<AuditFrameworkId, AuditFrameworkDefinition> = AUDIT_FRAMEWORKS.reduce(
  (acc, framework) => ({
    ...acc,
    [framework.id]: framework,
  }),
  {} as Record<AuditFrameworkId, AuditFrameworkDefinition>
);

export const DEFAULT_AUDIT_FRAMEWORK_SELECTION: AuditFrameworkId[] = ['SOX', 'ISO_27001'];
