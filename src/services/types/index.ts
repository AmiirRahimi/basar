export type RequestArgs = {
  url: string;
  method?: string;
  headers?: HeadersInit | undefined;
  body?: any;
  pathParams?: string[];
};

export type RequestOptions = {
  queryKey?: any[];
  successMessage?: string;
  errorMessage?: string;
};

export type HttpResponse<T, Paginated extends boolean = false> = {
  payload: Paginated extends true ? ResponsePayload<T> : T;
  timestamp: number | string;
  requestId?: string;
  error: any;
  status: 'SUCCEEDED' | 'FAILED' | 'Internal Server Error' | string;
  path?: string;
  data?: any;
} & Record<string, any>;

type SortType = {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
};

type PageableType = {
  pageNumber: number;
  pageSize: number;
  sort: SortType;
  offset: number;
  unpaged: boolean;
  paged: boolean;
};

export type ResponsePayload<T> = {
  content: T;
  pageable: PageableType;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: SortType;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
};

export interface UserPayload {
  user: User;
  profile: Profile;
  departmentIds: number[];
  extensions: ExtensionItem[];
  loginPreference: unknown | null;
  groupIds: number[];
  permissionNames: string[];
  specialPermissionNames: string[];
  managedUserIds: number[];
  managedGroupIds: number[];
  managedPermissionIds: number[];
  managedSpecialPermissionIds: number[];
  hasSuperAccess: boolean;
}

export interface User {
  id: number;
  authType: string;
  username: string;
  password: string;
  profileId: number;
  profile: Profile;
  languageId: number;
  spyNumber?: string | null;
  extension?: string | null;
  allowDelete: boolean;
  smsCredit: number;
  siteCssId: number;
  lastLoginTimestamp: number;
  lastLogoutTimestamp: number;
  lastVisitTimestamp: number;
  state: string;
  bundleAllAgent: number;
  salt?: string | null;
  vccId?: number | null;
  extensionStatuses?: unknown | null;
  groups?: unknown | null;
  managersUsers?: unknown | null;
  groupsManagers?: unknown | null;
  managersPermissions?: unknown | null;
  managersSpecialPermissions?: unknown | null;
}

interface Department {
  name: string | null;
  parent: string | null;
}

export interface Profile {
  id: number;
  nickName: string;
  personelNo?: string | null;
  gender?: string | null;
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  department?: Department | null;
  departmentId?: number | null;
  mobile?: string | null;
  mobile2?: string | null;
  email?: string | null;
  email2?: string | null;
  email3?: string | null;
  homePhone?: string | null;
  homeFax?: string | null;
  homeCountry?: string | null;
  homeProvience?: string | null;
  homeCity?: string | null;
  homeAddress?: string | null;
  homeZip?: string | null;
  homeWebpage?: string | null;
  bussinessCountry?: string | null;
  bussinessProvience?: string | null;
  bussinessCity?: string | null;
  bussinessAddress?: string | null;
  bussinessZip?: string | null;
  bussinessOffice?: string | null;
  bussinessPhone?: string | null;
  bussinessFax?: string | null;
  bussinessPager?: string | null;
  bussinessIpPhone?: string | null;
  bussinessWebpage?: string | null;
  birthDate?: string | null;
  comments?: string | null;
  userId?: number | null;
  vccId?: number | null;
  avatarAddress?: string | null;
  extensions?: unknown | null;
}

export interface ExtensionItem {
  id: number;
  number: string;
  password?: string | null;
}
