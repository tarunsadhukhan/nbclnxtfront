/**
 * IDManager utility for transforming and standardizing entity IDs
 * This utility helps convert numeric or simple IDs to more descriptive formats
 * and handles different data structures that might be received from the API
 */

type EntityType = 'role' | 'company' | 'branch' | 'user' | 'department' | string;

// Configuration interface for ID transformation
export interface IdTransformConfig {
  // Specific ID fields to transform (if empty, transform all *_id fields)
  fieldsToTransform?: string[];
  // ID fields to exclude from transformation
  fieldsToExclude?: string[];
  // Custom parent-child relationships for nested entities
  relationships?: Array<{
    parent: string; // parent entity type (e.g., 'company')
    parentIdField: string; // field containing parent ID (e.g., 'company_id')
    child: string; // child entity type (e.g., 'branch')
    childArrayField: string; // field containing child array (e.g., 'branches')
    childIdField: string; // field containing child ID (e.g., 'branch_id')
  }>;
}

/**
 * Transforms a simple ID into a descriptive format with entity type prefix
 * @param id - The original ID value
 * @param entityType - The type of entity (role, company, branch, etc.)
 * @param parentContext - Optional parent entity context (e.g., company_id for branches)
 * @returns Transformed ID string in format "{entityType}_id_{id}" or with parent context
 */
export function transformId(
  id: string | number, 
  entityType: EntityType, 
  parentContext?: { type: EntityType; id: string | number }
): string {
  if (id === null || id === undefined) return '';
  
  const idStr = String(id);
  
  if (parentContext) {
    return `${parentContext.type}_${entityType}_id_${idStr}`;
  }
  
  return `${entityType}_id_${idStr}`;
}

/**
 * Transforms an entire data object or array, converting all ID fields to the descriptive format
 * @param data - The data object or array to transform
 * @param config - Configuration options for the transformation
 * @returns A new object with transformed IDs
 */
export function transformDataIds<T>(data: T, config: IdTransformConfig = {}): T {
  // Handle null or undefined
  if (data === null || data === undefined) return data;
  
  // Extract configuration
  const { fieldsToTransform = [], fieldsToExclude = [], relationships = [] } = config;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => transformDataIds(item, config)) as unknown as T;
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const result = { ...data } as any;
    
    // Process each key in the object
    for (const key in result) {
      // Skip excluded fields
      if (fieldsToExclude.includes(key)) {
        continue;
      }
      
      // Check if key is an ID field that should be transformed
      const isIdField = key.endsWith('_id') && result[key] !== null;
      const shouldTransform = fieldsToTransform.length === 0 || fieldsToTransform.includes(key);
      
      if (isIdField && shouldTransform) {
        const entityType = key.replace('_id', '');
        result[key] = transformId(result[key], entityType);
      } 
      // Handle nested objects or arrays
      else if (typeof result[key] === 'object' && result[key] !== null) {
        // Check for defined relationships
        const relationship = relationships.find(rel => 
          rel.childArrayField === key && result[rel.parentIdField] !== undefined
        );
        
        if (relationship && Array.isArray(result[key])) {
          result[key] = result[key].map((child: any) => {
            // Apply the parent context for child IDs
            if (child[relationship.childIdField]) {
              const parentType = relationship.parent;
              const parentId = result[relationship.parentIdField];
              
              child[relationship.childIdField] = transformId(
                child[relationship.childIdField],
                relationship.child,
                { type: parentType, id: parentId }
              );
            }
            return transformDataIds(child, config);
          });
        } else {
          result[key] = transformDataIds(result[key], config);
        }
      }
    }
    return result;
  }
  
  // Return primitive values unchanged
  return data;
}

/**
 * Extracts the original ID from a transformed ID string
 * @param transformedId - The transformed ID string (e.g., "role_id_1")
 * @returns The original ID value
 */
export function extractOriginalId(transformedId: string): string | number {
  if (!transformedId) return '';
  
  const matches = transformedId.match(/_id_(\d+)$/);
  return matches ? matches[1] : transformedId;
}

/**
 * Example usage for different scenarios:
 * 
 * 1. Transform all ID fields in data:
 * const transformed = transformDataIds(data);
 * 
 * 2. Transform only specific ID fields:
 * const transformed = transformDataIds(data, { 
 *   fieldsToTransform: ['company_id', 'branch_id'] 
 * });
 * 
 * 3. Transform all except specific fields:
 * const transformed = transformDataIds(data, { 
 *   fieldsToExclude: ['role_id'] 
 * });
 * 
 * 4. Define custom parent-child relationships:
 * const transformed = transformDataIds(data, {
 *   relationships: [{
 *     parent: 'company',
 *     parentIdField: 'company_id',
 *     child: 'branch',
 *     childArrayField: 'branches',
 *     childIdField: 'branch_id'
 *   }]
 * });
 */