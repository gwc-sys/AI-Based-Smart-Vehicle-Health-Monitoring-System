import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'ai-vehicle-health-monitoring-app',
  location: 'us-east4'
};

export const listCategoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCategories');
}
listCategoriesRef.operationName = 'ListCategories';

export function listCategories(dc) {
  return executeQuery(listCategoriesRef(dc));
}

export const myNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MyNotes');
}
myNotesRef.operationName = 'MyNotes';

export function myNotes(dc) {
  return executeQuery(myNotesRef(dc));
}

export const createUserNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserNote', inputVars);
}
createUserNoteRef.operationName = 'CreateUserNote';

export function createUserNote(dcOrVars, vars) {
  return executeMutation(createUserNoteRef(dcOrVars, vars));
}

export const updateMyDisplayNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMyDisplayName', inputVars);
}
updateMyDisplayNameRef.operationName = 'UpdateMyDisplayName';

export function updateMyDisplayName(dcOrVars, vars) {
  return executeMutation(updateMyDisplayNameRef(dcOrVars, vars));
}

