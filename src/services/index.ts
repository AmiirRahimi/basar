export {
  configureTelcServices,
  getTelcServicesConfig,
  getApiBaseUrl,
  getApiBaseUrlIvr,
  getAuthEndpoint,
  AUTH_ENDPOINTS,
  type TelcServicesConfig,
} from './config';

export * from './auth/cookies';
export * from './auth/tokens';
export * from './auth/login';
export * from './auth/rememberMe';
export * from './auth/hash';

export { default as useApiMethods } from './hooks/useApiMethods';
export { default as useApiRequest } from './hooks/useApiRequest';
export { useToast } from './hooks/useToast';
export { default as useUser } from './hooks/useUser';
export { default as usePermission } from './hooks/usePermission';
export { default as useSpecialPermission } from './hooks/useSpecialPermission';
export { default as useAuth } from './hooks/useAuth';
