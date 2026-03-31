import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Category_Key {
  id: UUIDString;
  __typename?: 'Category_Key';
}

export interface CreateUserNoteData {
  note_insert: Note_Key;
}

export interface CreateUserNoteVariables {
  title: string;
  content: string;
  isImportant?: boolean | null;
  categoryId?: UUIDString | null;
}

export interface ListCategoriesData {
  categories: ({
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
  } & Category_Key)[];
}

export interface MyNotesData {
  notes: ({
    id: UUIDString;
    title: string;
    content: string;
    createdAt: TimestampString;
    isImportant?: boolean | null;
    category?: {
      name: string;
    };
  } & Note_Key)[];
}

export interface Note_Key {
  id: UUIDString;
  __typename?: 'Note_Key';
}

export interface UpdateMyDisplayNameData {
  user_update?: User_Key | null;
}

export interface UpdateMyDisplayNameVariables {
  newDisplayName: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListCategoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCategoriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCategoriesData, undefined>;
  operationName: string;
}
export const listCategoriesRef: ListCategoriesRef;

export function listCategories(options?: ExecuteQueryOptions): QueryPromise<ListCategoriesData, undefined>;
export function listCategories(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCategoriesData, undefined>;

interface MyNotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<MyNotesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<MyNotesData, undefined>;
  operationName: string;
}
export const myNotesRef: MyNotesRef;

export function myNotes(options?: ExecuteQueryOptions): QueryPromise<MyNotesData, undefined>;
export function myNotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<MyNotesData, undefined>;

interface CreateUserNoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserNoteVariables): MutationRef<CreateUserNoteData, CreateUserNoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserNoteVariables): MutationRef<CreateUserNoteData, CreateUserNoteVariables>;
  operationName: string;
}
export const createUserNoteRef: CreateUserNoteRef;

export function createUserNote(vars: CreateUserNoteVariables): MutationPromise<CreateUserNoteData, CreateUserNoteVariables>;
export function createUserNote(dc: DataConnect, vars: CreateUserNoteVariables): MutationPromise<CreateUserNoteData, CreateUserNoteVariables>;

interface UpdateMyDisplayNameRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMyDisplayNameVariables): MutationRef<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateMyDisplayNameVariables): MutationRef<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
  operationName: string;
}
export const updateMyDisplayNameRef: UpdateMyDisplayNameRef;

export function updateMyDisplayName(vars: UpdateMyDisplayNameVariables): MutationPromise<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
export function updateMyDisplayName(dc: DataConnect, vars: UpdateMyDisplayNameVariables): MutationPromise<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;

