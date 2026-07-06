import { WorkflowRunner } from './workflow-runner';

/**
 * Brand Profile Automation Example
 * 
 * このスクリプトを実行すると、ブランド更新から収益確認までの
 * 一連の Business Engine 連携がイベント駆動で自動実行されます。
 */
export async function runBrandProfileAutomation() {
  const runner = new WorkflowRunner();
  const workflowId = `wf-automation-${Date.now()}`;

  console.log("=== Starting Brand Profile Automation Workflow ===");
  
  // 最初のステップ（Brand更新）をキック
  // これにより、イベントの連鎖が開始されます
  await runner.runStep(workflowId, 'BrandUpdate');
}

// 実行シミュレーション (Node.js環境想定)
if (require.main === module) {
  runBrandProfileAutomation();
}
