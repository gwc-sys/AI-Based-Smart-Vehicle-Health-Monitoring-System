const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

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

exports.listCategories = function listCategories(dc) {
  return executeQuery(listCategoriesRef(dc));
};

const myNotesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MyNotes');
}
myNotesRef.operationName = 'MyNotes';
exports.myNotesRef = myNotesRef;

exports.myNotes = function myNotes(dc) {
  return executeQuery(myNotesRef(dc));
};

const createUserNoteRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserNote', inputVars);
}
createUserNoteRef.operationName = 'CreateUserNote';
exports.createUserNoteRef = createUserNoteRef;

exports.createUserNote = function createUserNote(dcOrVars, vars) {
  return executeMutation(createUserNoteRef(dcOrVars, vars));
};

const updateMyDisplayNameRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateMyDisplayName', inputVars);
}
updateMyDisplayNameRef.operationName = 'UpdateMyDisplayName';
exports.updateMyDisplayNameRef = updateMyDisplayNameRef;

exports.updateMyDisplayName = function updateMyDisplayName(dcOrVars, vars) {
  return executeMutation(updateMyDisplayNameRef(dcOrVars, vars));
};
