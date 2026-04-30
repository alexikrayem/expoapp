const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const buildDynamicUpdate = ({
  payload,
  fieldMap,
  startIndex = 1,
}) => {
  const updateFields = [];
  const updateValues = [];
  const updatedFieldNames = [];
  let paramIndex = startIndex;

  for (const [inputKey, config] of Object.entries(fieldMap || {})) {
    if (!hasOwn(payload, inputKey)) continue;

    const column = config?.column || inputKey;
    const transform = config?.transform;
    const shouldSkip = config?.skip;
    const rawValue = payload[inputKey];
    const value = typeof transform === 'function' ? transform(rawValue, payload) : rawValue;

    if (typeof shouldSkip === 'function' && shouldSkip(value, payload)) {
      continue;
    }

    updateFields.push(`${column} = $${paramIndex}`);
    updateValues.push(value);
    updatedFieldNames.push(column);
    paramIndex += 1;
  }

  return {
    updateFields,
    updateValues,
    updatedFieldNames,
    nextParamIndex: paramIndex,
  };
};

module.exports = {
  buildDynamicUpdate,
};
