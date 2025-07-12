import React from 'react'
import { clsx } from 'clsx'

export interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className
}) => {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input: React.FC<InputProps> = ({
  error,
  className,
  ...props
}) => {
  return (
    <input
      className={clsx(
        'block w-full px-3 py-2 border rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        error
          ? 'border-red-300 text-red-900 placeholder-red-300'
          : 'border-gray-300 text-gray-900 placeholder-gray-400',
        className
      )}
      {...props}
    />
  )
}