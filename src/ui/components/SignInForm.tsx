'use client';

import { useState, type FormEvent } from 'react';
import { Button } from './Button';
import Checkbox from './Checkbox';
import { Input } from './Input';
import { Password } from './Password';

export type SignInFormLabels = {
  username: string;
  usernameRequired?: string;
  password: string;
  passwordPlaceholder: string;
  passwordRequired?: string;
  rememberMe: string;
  signIn: string;
  invalidCredentials?: string;
};

export type SignInFormProps = {
  labels: SignInFormLabels;
  onSubmit: (data: {
    username: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<{ ok: true } | { ok: false; field?: 'username' | 'password' }>;
  initialUsername?: string;
  initialRememberMe?: boolean;
  /** When false, only username is required (config-panel behaviour). Default true. */
  requirePassword?: boolean;
  onRememberMeChange?: (rememberMe: boolean) => void;
  className?: string;
};

export function SignInForm({
  labels,
  onSubmit,
  initialUsername = '',
  initialRememberMe = false,
  requirePassword = true,
  onRememberMeChange,
  className = 'space-y-5',
}: SignInFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(initialRememberMe);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRememberMeChange = () => {
    setRememberMe((prev) => {
      const next = !prev;
      onRememberMeChange?.(next);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setUsernameError(labels.usernameRequired || labels.username);
      return;
    }

    if (requirePassword && !password) {
      setPasswordError(labels.passwordRequired || labels.password);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        username: trimmedUsername,
        password,
        rememberMe,
      });

      if (!result.ok) {
        const message = labels.invalidCredentials || labels.password;
        if (result.field === 'username') {
          setUsernameError(message);
        } else {
          setPasswordError(message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <Input
        type="text"
        autoComplete="username"
        size="lg"
        fullWidth
        label={labels.username}
        placeholder={labels.username}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          if (usernameError) setUsernameError('');
        }}
        error={usernameError}
      />

      <Password
        autoComplete="current-password"
        label={labels.password}
        placeholder={labels.passwordPlaceholder}
        size="lg"
        fullWidth
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (passwordError) setPasswordError('');
        }}
        error={passwordError}
      />

      <div className="flex items-center justify-between pt-1">
        <Checkbox
          checked={rememberMe}
          onChange={handleRememberMeChange}
          label={labels.rememberMe}
          variant="flat"
        />
      </div>

      <Button
        className="w-full"
        type="submit"
        size="lg"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {labels.signIn}
      </Button>
    </form>
  );
}
