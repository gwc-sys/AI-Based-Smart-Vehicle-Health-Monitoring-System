import { ListCategoriesData, MyNotesData, CreateUserNoteData, CreateUserNoteVariables, UpdateMyDisplayNameData, UpdateMyDisplayNameVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListCategories(options?: useDataConnectQueryOptions<ListCategoriesData>): UseDataConnectQueryResult<ListCategoriesData, undefined>;
export function useListCategories(dc: DataConnect, options?: useDataConnectQueryOptions<ListCategoriesData>): UseDataConnectQueryResult<ListCategoriesData, undefined>;

export function useMyNotes(options?: useDataConnectQueryOptions<MyNotesData>): UseDataConnectQueryResult<MyNotesData, undefined>;
export function useMyNotes(dc: DataConnect, options?: useDataConnectQueryOptions<MyNotesData>): UseDataConnectQueryResult<MyNotesData, undefined>;

export function useCreateUserNote(options?: useDataConnectMutationOptions<CreateUserNoteData, FirebaseError, CreateUserNoteVariables>): UseDataConnectMutationResult<CreateUserNoteData, CreateUserNoteVariables>;
export function useCreateUserNote(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserNoteData, FirebaseError, CreateUserNoteVariables>): UseDataConnectMutationResult<CreateUserNoteData, CreateUserNoteVariables>;

export function useUpdateMyDisplayName(options?: useDataConnectMutationOptions<UpdateMyDisplayNameData, FirebaseError, UpdateMyDisplayNameVariables>): UseDataConnectMutationResult<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
export function useUpdateMyDisplayName(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMyDisplayNameData, FirebaseError, UpdateMyDisplayNameVariables>): UseDataConnectMutationResult<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
