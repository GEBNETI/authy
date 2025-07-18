import { useState, useCallback } from 'react';
import { z } from 'zod';

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  setValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string) => void;
  clearErrors: () => void;
  handleChange: (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (name: keyof T) => () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
  isValid: boolean;
}

export const useForm = <T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate field
  const validateField = useCallback((name: keyof T, value: any): string | undefined => {
    if (!validationSchema) return undefined;

    try {
      // Create a full object with current values and the new field value
      const fieldData = { ...values, [name]: value };
      validationSchema.parse(fieldData);
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Find the error specific to this field
        const fieldError = error.issues.find(issue => 
          issue.path.length > 0 && issue.path[0] === name
        );
        return fieldError?.message;
      }
      return undefined;
    }
  }, [validationSchema, values]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    if (!validationSchema) return true;

    try {
      validationSchema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        error.issues.forEach((err: any) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof T] = err.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  }, [values, validationSchema]);

  // Set field value
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Handle input change
  const handleChange = useCallback((name: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValue(name, value);
  }, [setValue]);

  // Handle input blur
  const handleBlur = useCallback((name: keyof T) => () => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field on blur
    const error = validateField(name, values[name]);
    if (error) {
      setFieldError(name, error);
    }
  }, [values, validateField, setFieldError]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // Mark all fields as touched
    const touchedFields: Partial<Record<keyof T, boolean>> = {};
    Object.keys(values).forEach(key => {
      touchedFields[key as keyof T] = true;
    });
    setTouched(touchedFields);

    // Validate all fields
    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      // Handle submission error
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, isSubmitting, validateAll, onSubmit]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 && 
                  Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldError,
    clearErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isValid,
  };
};

export default useForm;