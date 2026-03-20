# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListCategories*](#listcategories)
  - [*MyNotes*](#mynotes)
- [**Mutations**](#mutations)
  - [*CreateUserNote*](#createusernote)
  - [*UpdateMyDisplayName*](#updatemydisplayname)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListCategories
You can execute the `ListCategories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCategories(): QueryPromise<ListCategoriesData, undefined>;

interface ListCategoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCategoriesData, undefined>;
}
export const listCategoriesRef: ListCategoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCategories(dc: DataConnect): QueryPromise<ListCategoriesData, undefined>;

interface ListCategoriesRef {
  ...
  (dc: DataConnect): QueryRef<ListCategoriesData, undefined>;
}
export const listCategoriesRef: ListCategoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCategoriesRef:
```typescript
const name = listCategoriesRef.operationName;
console.log(name);
```

### Variables
The `ListCategories` query has no variables.
### Return Type
Recall that executing the `ListCategories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCategoriesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCategoriesData {
  categories: ({
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
  } & Category_Key)[];
}
```
### Using `ListCategories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCategories } from '@dataconnect/generated';


// Call the `listCategories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCategories();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCategories(dataConnect);

console.log(data.categories);

// Or, you can use the `Promise` API.
listCategories().then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

### Using `ListCategories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCategoriesRef } from '@dataconnect/generated';


// Call the `listCategoriesRef()` function to get a reference to the query.
const ref = listCategoriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCategoriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.categories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.categories);
});
```

## MyNotes
You can execute the `MyNotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
myNotes(): QueryPromise<MyNotesData, undefined>;

interface MyNotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<MyNotesData, undefined>;
}
export const myNotesRef: MyNotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
myNotes(dc: DataConnect): QueryPromise<MyNotesData, undefined>;

interface MyNotesRef {
  ...
  (dc: DataConnect): QueryRef<MyNotesData, undefined>;
}
export const myNotesRef: MyNotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the myNotesRef:
```typescript
const name = myNotesRef.operationName;
console.log(name);
```

### Variables
The `MyNotes` query has no variables.
### Return Type
Recall that executing the `MyNotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `MyNotesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `MyNotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, myNotes } from '@dataconnect/generated';


// Call the `myNotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await myNotes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await myNotes(dataConnect);

console.log(data.notes);

// Or, you can use the `Promise` API.
myNotes().then((response) => {
  const data = response.data;
  console.log(data.notes);
});
```

### Using `MyNotes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, myNotesRef } from '@dataconnect/generated';


// Call the `myNotesRef()` function to get a reference to the query.
const ref = myNotesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = myNotesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.notes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.notes);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUserNote
You can execute the `CreateUserNote` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUserNote(vars: CreateUserNoteVariables): MutationPromise<CreateUserNoteData, CreateUserNoteVariables>;

interface CreateUserNoteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserNoteVariables): MutationRef<CreateUserNoteData, CreateUserNoteVariables>;
}
export const createUserNoteRef: CreateUserNoteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUserNote(dc: DataConnect, vars: CreateUserNoteVariables): MutationPromise<CreateUserNoteData, CreateUserNoteVariables>;

interface CreateUserNoteRef {
  ...
  (dc: DataConnect, vars: CreateUserNoteVariables): MutationRef<CreateUserNoteData, CreateUserNoteVariables>;
}
export const createUserNoteRef: CreateUserNoteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserNoteRef:
```typescript
const name = createUserNoteRef.operationName;
console.log(name);
```

### Variables
The `CreateUserNote` mutation requires an argument of type `CreateUserNoteVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserNoteVariables {
  title: string;
  content: string;
  isImportant?: boolean | null;
  categoryId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `CreateUserNote` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserNoteData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserNoteData {
  note_insert: Note_Key;
}
```
### Using `CreateUserNote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUserNote, CreateUserNoteVariables } from '@dataconnect/generated';

// The `CreateUserNote` mutation requires an argument of type `CreateUserNoteVariables`:
const createUserNoteVars: CreateUserNoteVariables = {
  title: ..., 
  content: ..., 
  isImportant: ..., // optional
  categoryId: ..., // optional
};

// Call the `createUserNote()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUserNote(createUserNoteVars);
// Variables can be defined inline as well.
const { data } = await createUserNote({ title: ..., content: ..., isImportant: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUserNote(dataConnect, createUserNoteVars);

console.log(data.note_insert);

// Or, you can use the `Promise` API.
createUserNote(createUserNoteVars).then((response) => {
  const data = response.data;
  console.log(data.note_insert);
});
```

### Using `CreateUserNote`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserNoteRef, CreateUserNoteVariables } from '@dataconnect/generated';

// The `CreateUserNote` mutation requires an argument of type `CreateUserNoteVariables`:
const createUserNoteVars: CreateUserNoteVariables = {
  title: ..., 
  content: ..., 
  isImportant: ..., // optional
  categoryId: ..., // optional
};

// Call the `createUserNoteRef()` function to get a reference to the mutation.
const ref = createUserNoteRef(createUserNoteVars);
// Variables can be defined inline as well.
const ref = createUserNoteRef({ title: ..., content: ..., isImportant: ..., categoryId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserNoteRef(dataConnect, createUserNoteVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.note_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.note_insert);
});
```

## UpdateMyDisplayName
You can execute the `UpdateMyDisplayName` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateMyDisplayName(vars: UpdateMyDisplayNameVariables): MutationPromise<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;

interface UpdateMyDisplayNameRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateMyDisplayNameVariables): MutationRef<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
}
export const updateMyDisplayNameRef: UpdateMyDisplayNameRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMyDisplayName(dc: DataConnect, vars: UpdateMyDisplayNameVariables): MutationPromise<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;

interface UpdateMyDisplayNameRef {
  ...
  (dc: DataConnect, vars: UpdateMyDisplayNameVariables): MutationRef<UpdateMyDisplayNameData, UpdateMyDisplayNameVariables>;
}
export const updateMyDisplayNameRef: UpdateMyDisplayNameRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMyDisplayNameRef:
```typescript
const name = updateMyDisplayNameRef.operationName;
console.log(name);
```

### Variables
The `UpdateMyDisplayName` mutation requires an argument of type `UpdateMyDisplayNameVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMyDisplayNameVariables {
  newDisplayName: string;
}
```
### Return Type
Recall that executing the `UpdateMyDisplayName` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMyDisplayNameData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMyDisplayNameData {
  user_update?: User_Key | null;
}
```
### Using `UpdateMyDisplayName`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMyDisplayName, UpdateMyDisplayNameVariables } from '@dataconnect/generated';

// The `UpdateMyDisplayName` mutation requires an argument of type `UpdateMyDisplayNameVariables`:
const updateMyDisplayNameVars: UpdateMyDisplayNameVariables = {
  newDisplayName: ..., 
};

// Call the `updateMyDisplayName()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMyDisplayName(updateMyDisplayNameVars);
// Variables can be defined inline as well.
const { data } = await updateMyDisplayName({ newDisplayName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMyDisplayName(dataConnect, updateMyDisplayNameVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateMyDisplayName(updateMyDisplayNameVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateMyDisplayName`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMyDisplayNameRef, UpdateMyDisplayNameVariables } from '@dataconnect/generated';

// The `UpdateMyDisplayName` mutation requires an argument of type `UpdateMyDisplayNameVariables`:
const updateMyDisplayNameVars: UpdateMyDisplayNameVariables = {
  newDisplayName: ..., 
};

// Call the `updateMyDisplayNameRef()` function to get a reference to the mutation.
const ref = updateMyDisplayNameRef(updateMyDisplayNameVars);
// Variables can be defined inline as well.
const ref = updateMyDisplayNameRef({ newDisplayName: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMyDisplayNameRef(dataConnect, updateMyDisplayNameVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

