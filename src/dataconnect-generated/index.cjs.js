const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'ai-vehicle-health-monitoring-app',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listCategoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListCategories');
}
listCategoriesRef.operationName = 'ListCategories';
exports.listCategoriesRef = listCategoriesRef;

exports.listCategories = function listCategories(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listCategoriesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const myNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MyNotes');
}
myNotesRef.operationName = 'MyNotes';
exports.myNotesRef = myNotesRef;

exports.myNotes = function myNotes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(myNotesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createUserNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserNote', inputVars);
}
createUserNoteRef.operationName = 'CreateUserNote';
exports.createUserNoteRef = createUserNoteRef;

exports.createUserNote = function createUserNote(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createUserNoteRef(dcInstance, inputVars));
}
;

const updateMyDisplayNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMyDisplayName', inputVars);
}
updateMyDisplayNameRef.operationName = 'UpdateMyDisplayName';
exports.updateMyDisplayNameRef = updateMyDisplayNameRef;

exports.updateMyDisplayName = function updateMyDisplayName(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateMyDisplayNameRef(dcInstance, inputVars));
}
;
