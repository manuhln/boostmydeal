import { IBaseNodeHandler, IExecutionContext, INodeExecutionResult } from './IBaseNodeHandler';

export class ConditionNodeHandler extends IBaseNodeHandler {
  async execute(node: any, context: IExecutionContext): Promise<INodeExecutionResult> {
    try {
      console.log(`🔀 [ConditionNodeHandler] Evaluating condition node ${node.id}`);

      const conditions = node.data.conditions || [];
      
      // Each condition group is an OR relationship
      // Within each group, conditions are AND relationship
      let overallResult = false;

      for (const conditionGroup of conditions) {
        let groupResult = true;

        for (const condition of conditionGroup) {
          const resolvedVariable = this.resolvePlaceholders(condition.variable, context);
          const expectedValue = condition.value;
          const operator = condition.operator;

          let conditionMet = false;

          switch (operator) {
            case 'is':
            case 'equals':
              conditionMet = String(resolvedVariable) === String(expectedValue);
              break;
            case 'is_not':
            case 'not_equals':
              conditionMet = resolvedVariable !== expectedValue;
              break;
            case 'contains':
              conditionMet = String(resolvedVariable).toLowerCase().includes(String(expectedValue).toLowerCase());
              break;
            case 'not_contains':
              conditionMet = !String(resolvedVariable).toLowerCase().includes(String(expectedValue).toLowerCase());
              break;
            case 'greater_than':
              conditionMet = Number(resolvedVariable) > Number(expectedValue);
              break;
            case 'less_than':
              conditionMet = Number(resolvedVariable) < Number(expectedValue);
              break;
            case 'is_empty':
              conditionMet = !resolvedVariable || resolvedVariable === '';
              break;
            case 'is_not_empty':
              conditionMet = Boolean(resolvedVariable && resolvedVariable !== '');
              break;
            default:
              console.warn(`Unknown operator: ${operator}`);
              conditionMet = false;
          }

          console.log(`🔍 [ConditionNodeHandler] Condition: ${resolvedVariable} ${operator} ${expectedValue} = ${conditionMet}`);

          if (!conditionMet) {
            groupResult = false;
            break; // AND failed, skip rest of group
          }
        }

        if (groupResult) {
          overallResult = true;
          break; // OR succeeded, we're done
        }
      }

      const exitHandle = overallResult ? 'true' : 'false';
      
      console.log(`✅ [ConditionNodeHandler] Condition node ${node.id} result: ${exitHandle}`);

      return {
        exitHandle,
        data: {
          condition_result: overallResult,
          evaluated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ [ConditionNodeHandler] Error in condition node ${node.id}:`, error);
      
      return {
        exitHandle: 'false',
        data: {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}