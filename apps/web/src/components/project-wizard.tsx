'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { AUDIT_FRAMEWORK_DEFINITIONS, AUDIT_FRAMEWORK_VALUES, DEFAULT_AUDIT_FRAMEWORK_SELECTION } from '@/config/auditFrameworks';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormGroup,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';

const riskLevels = [
  { value: 'LOW', label: 'Bajo' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HIGH', label: 'Alto' },
] as const;

const auditFrameworkEnum = z.enum(AUDIT_FRAMEWORK_VALUES);

const auditFrameworkOptions = AUDIT_FRAMEWORK_VALUES.map((value) => ({
  value,
  label: AUDIT_FRAMEWORK_DEFINITIONS[value].label,
  description: AUDIT_FRAMEWORK_DEFINITIONS[value].description,
}));

type CompanyOption = {
  id: number;
  name: string;
};

const wizardSchema = z.object({
  companyId: z
    .string()
    .min(1, 'Selecciona la compañía')
    .regex(/^\d+$/, 'Ingresa un ID numérico válido'),
  projectName: z
    .string()
    .min(3, 'El nombre del proyecto debe tener al menos 3 caracteres')
    .max(120, 'El nombre del proyecto no puede exceder 120 caracteres'),
  description: z
    .string()
    .min(16, 'Describe brevemente el objetivo del proyecto (mínimo 16 caracteres)')
    .max(500, 'La descripción no puede exceder 500 caracteres'),
  objectives: z
    .array(
      z.object({
        value: z
          .string()
          .min(6, 'Cada objetivo debe tener al menos 6 caracteres')
          .max(180, 'Los objetivos deben ser concisos (máximo 180 caracteres)'),
      })
    )
    .min(1, 'Incluye al menos un objetivo principal'),
  stakeholders: z
    .array(
      z.object({
        name: z
          .string()
          .min(3, 'El nombre debe tener al menos 3 caracteres')
          .max(120, 'El nombre no puede exceder 120 caracteres'),
        role: z
          .string()
          .min(3, 'El rol debe tener al menos 3 caracteres')
          .max(120, 'El rol no puede exceder 120 caracteres'),
      })
    )
    .min(1, 'Registra al menos un stakeholder clave'),
  milestones: z
    .array(
      z.object({
        name: z
          .string()
          .min(3, 'El hito debe tener al menos 3 caracteres')
          .max(160, 'El hito no puede exceder 160 caracteres'),
        dueDate: z
          .string()
          .min(1, 'Ingresa una fecha objetivo')
          .refine((value) => !Number.isNaN(Date.parse(value)), 'La fecha no es válida'),
      })
    )
    .min(1, 'Incluye al menos un hito de seguimiento'),
  risks: z
    .array(
      z.object({
        title: z
          .string()
          .min(6, 'El título debe tener al menos 6 caracteres')
          .max(160, 'El título no puede exceder 160 caracteres'),
        description: z
          .string()
          .min(10, 'Describe el riesgo en al menos 10 caracteres')
          .max(400, 'La descripción no puede exceder 400 caracteres'),
        likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
          errorMap: () => ({ message: 'Selecciona una probabilidad' }),
        }),
        impact: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
          errorMap: () => ({ message: 'Selecciona un impacto' }),
        }),
      })
    )
    .min(1, 'Registra al menos un riesgo inicial'),
  frameworks: z
    .array(auditFrameworkEnum)
    .min(1, 'Selecciona al menos un marco de auditoría'),
});

export type ProjectWizardValues = z.infer<typeof wizardSchema>;

const defaultValues: ProjectWizardValues = {
  companyId: '1',
  projectName: '',
  description: '',
  objectives: [{ value: '' }],
  stakeholders: [{ name: '', role: '' }],
  milestones: [
    {
      name: '',
      dueDate: '',
    },
  ],
  risks: [
    {
      title: '',
      description: '',
      likelihood: 'MEDIUM',
      impact: 'MEDIUM',
    },
  ],
  frameworks: DEFAULT_AUDIT_FRAMEWORK_SELECTION,
};

const steps = [
  {
    label: 'Contexto del proyecto',
    description: 'Define la compañía, el nombre de la auditoría y su propósito general.',
    fields: ['companyId', 'projectName', 'description'] as const,
  },
  {
    label: 'Objetivos y alcance',
    description: 'Alinea los objetivos estratégicos que guiarán la auditoría.',
    fields: ['objectives'] as const,
  },
  {
    label: 'Gobernanza inicial',
    description: 'Identifica stakeholders y los hitos clave de seguimiento.',
    fields: ['stakeholders', 'milestones'] as const,
  },
  {
    label: 'Marcos de auditoría',
    description: 'Activa los procesos y marcos de referencia que guiarán la revisión.',
    fields: ['frameworks'] as const,
  },
  {
    label: 'Riesgos y confirmación',
    description: 'Prioriza riesgos iniciales y confirma el resumen antes de crear el proyecto.',
    fields: ['risks'] as const,
  },
];

export function ProjectWizard() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdProjectName, setCreatedProjectName] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectWizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const objectivesArray = useFieldArray({ control, name: 'objectives' });
  const stakeholdersArray = useFieldArray({ control, name: 'stakeholders' });
  const milestonesArray = useFieldArray({ control, name: 'milestones' });
  const risksArray = useFieldArray({ control, name: 'risks' });

  const watchedValues = watch();

  const summary = useMemo(() => {
    return {
      objectives: objectivesArray.fields.map((field, index) => ({
        value: watchedValues.objectives?.[index]?.value ?? field.value,
      })),
      stakeholders: stakeholdersArray.fields.map((field, index) => ({
        name: watchedValues.stakeholders?.[index]?.name ?? field.name,
        role: watchedValues.stakeholders?.[index]?.role ?? field.role,
      })),
      milestones: milestonesArray.fields.map((field, index) => ({
        name: watchedValues.milestones?.[index]?.name ?? field.name,
        dueDate: watchedValues.milestones?.[index]?.dueDate ?? field.dueDate,
      })),
      risks: risksArray.fields.map((field, index) => ({
        title: watchedValues.risks?.[index]?.title ?? field.title,
        description: watchedValues.risks?.[index]?.description ?? field.description,
        likelihood: watchedValues.risks?.[index]?.likelihood ?? field.likelihood,
        impact: watchedValues.risks?.[index]?.impact ?? field.impact,
      })),
      frameworks: (watchedValues.frameworks ?? defaultValues.frameworks).map((value) => ({
        value,
        label: AUDIT_FRAMEWORK_DEFINITIONS[value].label,
      })),
    };
  }, [
    milestonesArray.fields,
    objectivesArray.fields,
    risksArray.fields,
    stakeholdersArray.fields,
    watchedValues.milestones,
    watchedValues.objectives,
    watchedValues.risks,
    watchedValues.stakeholders,
    watchedValues.frameworks,
  ]);

  useEffect(() => {
    let active = true;

    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const response = await fetch('/api/companies');
        if (!response.ok) {
          throw new Error('Failed to load companies');
        }
        const data = (await response.json()) as CompanyOption[];
        if (!active) {
          return;
        }
        setCompanies(data);
        setCompanyError(null);
        if (data.length > 0) {
          const selected = getValues('companyId');
          const exists = data.some((company) => company.id.toString() === selected);
          if (!selected || !exists) {
            setValue('companyId', data[0].id.toString(), { shouldValidate: true });
          }
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setCompanyError('No se pudieron cargar las compañías. Ingresa el ID manualmente.');
      } finally {
        if (active) {
          setIsLoadingCompanies(false);
        }
      }
    };

    loadCompanies();

    return () => {
      active = false;
    };
  }, [getValues, setValue]);

  const handleNext = async () => {
    setServerError(null);
    const fields = steps[activeStep]?.fields;
    if (!fields) {
      return;
    }
    const isStepValid = await trigger(fields as unknown as Parameters<typeof trigger>[0]);
    if (!isStepValid) {
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setServerError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      companyId: Number(values.companyId),
      name: values.projectName,
      description: values.description,
      wizard: {
        objectives: values.objectives.map((item) => item.value.trim()),
        stakeholders: values.stakeholders.map((item) => ({
          name: item.name.trim(),
          role: item.role.trim(),
        })),
        milestones: values.milestones.map((item) => ({
          name: item.name.trim(),
          dueDate: item.dueDate,
        })),
        risks: values.risks.map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          likelihood: item.likelihood,
          impact: item.impact,
        })),
        frameworks: values.frameworks,
      },
    };

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setServerError(errorBody?.message ?? 'No se pudo crear el proyecto. Intenta nuevamente.');
        return;
      }

      const project = await response.json();
      setCreatedProjectName(project.name ?? values.projectName);
      setActiveStep(steps.length);
      reset(defaultValues);
      router.refresh();
    } catch (error) {
      console.error('Project creation failed', error);
      setServerError('Ocurrió un error inesperado al crear el proyecto.');
    }
  });

  return (
    <Paper component="form" onSubmit={onSubmit} variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={600}>
            Wizard de creación de auditoría
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={620}>
            Completa los pasos para registrar una nueva auditoría en AMS. Los datos alimentarán la siembra automática de
            plantillas, KPIs y gobernanza inicial en el backend.
          </Typography>
        </Stack>

        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
          {activeStep === steps.length && (
            <Step>
              <StepLabel>Completado</StepLabel>
            </Step>
          )}
        </Stepper>

        {serverError && (
          <Alert severity="error" onClose={() => setServerError(null)}>
            {serverError}
          </Alert>
        )}

        {activeStep >= steps.length ? (
          <Stack spacing={2} alignItems="flex-start">
            <Alert severity="success" variant="outlined">
              <Typography variant="subtitle1" fontWeight={600}>
                ¡Proyecto creado!
              </Typography>
              <Typography variant="body2">
                {createdProjectName ?? 'El proyecto'} ya está disponible en la lista de proyectos. Puedes continuar configurando
                solicitudes, riesgos y aprobaciones desde el menú principal.
              </Typography>
            </Alert>
            <Button variant="contained" onClick={() => router.push('/projects')}>
              Volver a proyectos
            </Button>
          </Stack>
        ) : (
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {steps[activeStep].label}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {steps[activeStep].description}
              </Typography>
            </Box>

            {activeStep === 0 && (
              <Stack spacing={3}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    {(!companyError && (companies.length > 0 || isLoadingCompanies)) ? (
                      <TextField
                        select
                        fullWidth
                        label="Compañía"
                        disabled={isLoadingCompanies && companies.length === 0}
                        helperText={
                          errors.companyId?.message ||
                          (isLoadingCompanies
                            ? 'Cargando compañías disponibles...'
                            : 'Selecciona la compañía responsable de la auditoría.')
                        }
                        error={Boolean(errors.companyId)}
                        {...register('companyId')}
                      >
                        {isLoadingCompanies && companies.length === 0 ? (
                          <MenuItem value={watchedValues.companyId ?? ''} disabled>
                            Cargando compañías...
                          </MenuItem>
                        ) : (
                          companies.map((company) => (
                            <MenuItem key={company.id} value={company.id.toString()}>
                              {company.name} (ID {company.id})
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                    ) : (
                      <TextField
                        label="ID de la compañía"
                        type="number"
                        fullWidth
                        inputProps={{ min: 1 }}
                        helperText={
                          companyError ??
                          errors.companyId?.message ??
                          'Ingresa el ID numérico de la compañía objetivo.'
                        }
                        error={Boolean(errors.companyId) || Boolean(companyError)}
                        {...register('companyId')}
                      />
                    )}
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      label="Nombre del proyecto"
                      fullWidth
                      placeholder="Auditoría integral de controles 2025"
                      error={Boolean(errors.projectName)}
                      helperText={errors.projectName?.message ?? 'Define un nombre identificable para el equipo y el cliente.'}
                      {...register('projectName')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Descripción"
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Breve objetivo de la auditoría, alcance y drivers principales."
                      error={Boolean(errors.description)}
                      helperText={errors.description?.message ?? 'Resume el propósito y alcance para alinear expectativas.'}
                      {...register('description')}
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Objetivos estratégicos</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Define los objetivos que marcarán el éxito de la auditoría. Puedes listar varios para cubrir distintos
                    frentes.
                  </Typography>
                </Stack>
                <Stack spacing={2.5}>
                  {objectivesArray.fields.map((field, index) => (
                    <Stack key={field.id} direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="flex-start">
                      <TextField
                        fullWidth
                        label={`Objetivo ${index + 1}`}
                        placeholder="Ej. Obtener visibilidad del estado de controles SOX"
                        error={Boolean(errors.objectives?.[index]?.value)}
                        helperText={errors.objectives?.[index]?.value?.message}
                        {...register(`objectives.${index}.value` as const)}
                      />
                      <IconButton
                        aria-label="Eliminar objetivo"
                        color="error"
                        onClick={() => objectivesArray.remove(index)}
                        disabled={objectivesArray.fields.length === 1}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => objectivesArray.append({ value: '' })}
                  >
                    Añadir objetivo
                  </Button>
                </Stack>
              </Stack>
            )}

            {activeStep === 2 && (
              <Stack spacing={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Stakeholders clave</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Identifica a las personas responsables dentro del cliente y del equipo auditor.
                  </Typography>
                </Stack>
                <Stack spacing={2.5}>
                  {stakeholdersArray.fields.map((field, index) => (
                    <Grid container spacing={2} alignItems="flex-start" key={field.id}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Nombre"
                          placeholder="Ej. Ana Martínez"
                          error={Boolean(errors.stakeholders?.[index]?.name)}
                          helperText={errors.stakeholders?.[index]?.name?.message}
                          {...register(`stakeholders.${index}.name` as const)}
                        />
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Rol"
                          placeholder="Ej. Líder de Auditoría"
                          error={Boolean(errors.stakeholders?.[index]?.role)}
                          helperText={errors.stakeholders?.[index]?.role?.message}
                          {...register(`stakeholders.${index}.role` as const)}
                        />
                      </Grid>
                      <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <IconButton
                          aria-label="Eliminar stakeholder"
                          color="error"
                          onClick={() => stakeholdersArray.remove(index)}
                          disabled={stakeholdersArray.fields.length === 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => stakeholdersArray.append({ name: '', role: '' })}
                  >
                    Añadir stakeholder
                  </Button>
                </Stack>

                <Divider />

                <Stack spacing={1}>
                  <Typography variant="subtitle2">Hitos de seguimiento</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registra fechas clave para alinear expectativas con el comité y el cliente.
                  </Typography>
                </Stack>
                <Stack spacing={2.5}>
                  {milestonesArray.fields.map((field, index) => (
                    <Grid container spacing={2} alignItems="flex-start" key={field.id}>
                      <Grid item xs={12} md={7}>
                        <TextField
                          fullWidth
                          label="Nombre del hito"
                          placeholder="Ej. Reunión de kickoff"
                          error={Boolean(errors.milestones?.[index]?.name)}
                          helperText={errors.milestones?.[index]?.name?.message}
                          {...register(`milestones.${index}.name` as const)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Fecha objetivo"
                          InputLabelProps={{ shrink: true }}
                          error={Boolean(errors.milestones?.[index]?.dueDate)}
                          helperText={errors.milestones?.[index]?.dueDate?.message}
                          {...register(`milestones.${index}.dueDate` as const)}
                        />
                      </Grid>
                      <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <IconButton
                          aria-label="Eliminar hito"
                          color="error"
                          onClick={() => milestonesArray.remove(index)}
                          disabled={milestonesArray.fields.length === 1}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => milestonesArray.append({ name: '', dueDate: '' })}
                  >
                    Añadir hito
                  </Button>
                </Stack>
              </Stack>
            )}
            {activeStep === 3 && (
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Marcos y checklist</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecciona los marcos más relevantes para activar el checklist inicial del proyecto.
                  </Typography>
                </Stack>
                <Controller
                  control={control}
                  name="frameworks"
                  render={({ field }) => {
                    const selected = field.value ?? [];
                    return (
                      <FormControl component="fieldset" error={Boolean(errors.frameworks)}>
                        <FormGroup>
                          <Stack spacing={2}>
                            {auditFrameworkOptions.map((option) => {
                              const checked = selected.includes(option.value);
                              return (
                                <Stack key={option.value} direction="row" spacing={1.5} alignItems="flex-start">
                                  <Checkbox
                                    checked={checked}
                                    onChange={(event) => {
                                      const isChecked = event.target.checked;
                                      if (isChecked) {
                                        field.onChange([...selected, option.value]);
                                      } else {
                                        field.onChange(selected.filter((value) => value !== option.value));
                                      }
                                    }}
                                  />
                                  <Stack spacing={0.5}>
                                    <Typography variant="body2" fontWeight={600}>
                                      {option.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {option.description}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              );
                            })}
                          </Stack>
                        </FormGroup>
                        <FormHelperText>
                          {errors.frameworks?.message ??
                            'Marca los marcos que reflejan el tipo de auditoría y procesos a activar.'}
                        </FormHelperText>
                      </FormControl>
                    );
                  }}
                />
              </Stack>
            )}


            {activeStep === 4 && (
              <Stack spacing={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Riesgos iniciales</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Priorizamos riesgos para sembrar automáticamente planes de mitigación y seguimiento.
                  </Typography>
                </Stack>
                <Stack spacing={2.5}>
                  {risksArray.fields.map((field, index) => (
                    <Paper key={field.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="Título del riesgo"
                          placeholder="Ej. Retraso en carga de evidencia"
                          error={Boolean(errors.risks?.[index]?.title)}
                          helperText={errors.risks?.[index]?.title?.message}
                          {...register(`risks.${index}.title` as const)}
                        />
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label="Descripción"
                          placeholder="Describe el riesgo y su posible efecto en la auditoría"
                          error={Boolean(errors.risks?.[index]?.description)}
                          helperText={errors.risks?.[index]?.description?.message}
                          {...register(`risks.${index}.description` as const)}
                        />
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Controller
                              name={`risks.${index}.likelihood` as const}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  select
                                  fullWidth
                                  label="Probabilidad"
                                  error={Boolean(errors.risks?.[index]?.likelihood)}
                                  helperText={errors.risks?.[index]?.likelihood?.message}
                                  {...field}
                                >
                                  {riskLevels.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Controller
                              name={`risks.${index}.impact` as const}
                              control={control}
                              render={({ field }) => (
                                <TextField
                                  select
                                  fullWidth
                                  label="Impacto"
                                  error={Boolean(errors.risks?.[index]?.impact)}
                                  helperText={errors.risks?.[index]?.impact?.message}
                                  {...field}
                                >
                                  {riskLevels.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              )}
                            />
                          </Grid>
                        </Grid>
                        <Stack direction="row" justifyContent="flex-end">
                          <Button
                            type="button"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={() => risksArray.remove(index)}
                            disabled={risksArray.fields.length === 1}
                          >
                            Eliminar riesgo
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() =>
                      risksArray.append({ title: '', description: '', likelihood: 'MEDIUM', impact: 'MEDIUM' })
                    }
                  >
                    Añadir riesgo
                  </Button>
                </Stack>

                <Divider />

                <Stack spacing={1}>
                  <Typography variant="subtitle2">Resumen antes de crear</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revisa la información ingresada. Podrás actualizarla luego desde el overview del proyecto.
                  </Typography>
                </Stack>

                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Objetivos
                    </Typography>
                    <Stack component="ul" spacing={1} sx={{ m: 0, pl: 3 }}>
                      {summary.objectives.map((objective, index) => (
                        <Typography key={index} component="li" variant="body2">
                          {objective.value || '—'}
                        </Typography>
                      ))}
                    </Stack>

                    <Divider flexItem />

                    <Typography variant="subtitle1" fontWeight={600}>
                      Stakeholders
                    </Typography>
                    <Stack component="ul" spacing={1} sx={{ m: 0, pl: 3 }}>
                      {summary.stakeholders.map((stakeholder, index) => (
                        <Typography key={index} component="li" variant="body2">
                          <Typography component="span" fontWeight={600}>
                            {stakeholder.name || '—'}:
                          </Typography>{' '}
                          {stakeholder.role || '—'}
                        </Typography>
                      ))}
                    </Stack>

                    <Divider flexItem />

                    <Typography variant="subtitle1" fontWeight={600}>
                      Hitos
                    </Typography>
                    <Stack component="ul" spacing={1} sx={{ m: 0, pl: 3 }}>
                      {summary.milestones.map((milestone, index) => (
                        <Typography key={index} component="li" variant="body2">
                          <Typography component="span" fontWeight={600}>
                            {milestone.name || '—'}
                          </Typography>{' '}
                          — {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'Sin fecha definida'}
                        </Typography>
                      ))}
                    </Stack>

                    <Divider flexItem />

                    <Typography variant="subtitle1" fontWeight={600}>
                      Marcos activados
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {summary.frameworks.map((framework) => (
                        <Chip key={framework.value} label={framework.label} size="small" color="primary" variant="outlined" />
                      ))}
                    </Stack>

                    <Divider flexItem />

                    <Typography variant="subtitle1" fontWeight={600}>
                      Riesgos
                    </Typography>
                    <Stack component="ul" spacing={1.5} sx={{ m: 0, pl: 3 }}>
                      {summary.risks.map((risk, index) => (
                        <Stack key={index} component="li" spacing={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {risk.title || '—'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {risk.description || 'Sin descripción'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Probabilidad: {riskLevels.find((item) => item.value === risk.likelihood)?.label ?? 'N/A'} · Impacto:{' '}
                            {riskLevels.find((item) => item.value === risk.impact)?.label ?? 'N/A'}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            )}

            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button type="button" variant="outlined" disabled={activeStep === 0 || isSubmitting} onClick={handleBack}>
                Atrás
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando proyecto…' : 'Crear proyecto'}
                </Button>
              ) : (
                <Button type="button" variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
