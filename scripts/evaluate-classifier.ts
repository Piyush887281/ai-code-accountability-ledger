import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { AiOrchestratorService } from '../src/modules/ai/services/orchestrator.service';

// Threshold for classifying a diff as AI-authored
const AI_CONFIDENCE_THRESHOLD = 70;

interface EvalTestCase {
  id: string;
  diffContent: string;
  expectedAiAuthorship: boolean;
  rationale: string;
}

async function runEvaluation() {
  console.log('--- Starting AI Classifier Evaluation ---\n');

  const datasetPath = path.join(process.cwd(), 'eval', 'dataset.json');
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}. Please create it based on the schema.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf8');
  const dataset: EvalTestCase[] = JSON.parse(rawData);

  if (dataset.length === 0) {
    console.warn('Dataset is empty. Add test cases to eval/dataset.json.');
    process.exit(0);
  }

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;
  let errors = 0;

  // We use a dummy organization ID for eval purposes.
  // The Orchestrator Service is programmed to bypass DB usage tracking for this ID.
  const EVAL_ORG_ID = 'eval-test-org-id';

  for (const testCase of dataset) {
    console.log(`Evaluating case [${testCase.id}]...`);
    try {
      const confidence = await AiOrchestratorService.evaluateAuthorship(EVAL_ORG_ID, testCase.diffContent);
      
      if (confidence === null) {
        console.error(`  ❌ Failed to get a confidence score for ${testCase.id}`);
        errors++;
        continue;
      }

      const predictedAiAuthorship = confidence >= AI_CONFIDENCE_THRESHOLD;
      const isCorrect = predictedAiAuthorship === testCase.expectedAiAuthorship;

      console.log(`  Expected: ${testCase.expectedAiAuthorship ? 'AI' : 'Human'} | Predicted: ${predictedAiAuthorship ? 'AI' : 'Human'} (Confidence: ${confidence}%)`);
      
      if (testCase.expectedAiAuthorship && predictedAiAuthorship) truePositives++;
      else if (!testCase.expectedAiAuthorship && !predictedAiAuthorship) trueNegatives++;
      else if (!testCase.expectedAiAuthorship && predictedAiAuthorship) falsePositives++;
      else if (testCase.expectedAiAuthorship && !predictedAiAuthorship) falseNegatives++;

    } catch (err) {
      console.error(`  ❌ Error evaluating ${testCase.id}:`, err);
      errors++;
    }
  }

  console.log('\n--- Evaluation Results ---');
  const totalProcessed = truePositives + trueNegatives + falsePositives + falseNegatives;
  
  if (totalProcessed === 0) {
    console.log('No test cases were successfully processed.');
    process.exit(errors > 0 ? 1 : 0);
  }

  const accuracy = ((truePositives + trueNegatives) / totalProcessed) * 100;
  const precision = truePositives + falsePositives > 0 
    ? (truePositives / (truePositives + falsePositives)) * 100 
    : 0;
  const recall = truePositives + falseNegatives > 0 
    ? (truePositives / (truePositives + falseNegatives)) * 100 
    : 0;

  console.log(`Total Cases:     ${dataset.length}`);
  console.log(`Processed:       ${totalProcessed}`);
  console.log(`Errors:          ${errors}\n`);
  
  console.log(`True Positives:  ${truePositives}`);
  console.log(`False Positives: ${falsePositives}`);
  console.log(`True Negatives:  ${trueNegatives}`);
  console.log(`False Negatives: ${falseNegatives}\n`);

  console.log(`Accuracy:        ${accuracy.toFixed(2)}%`);
  console.log(`Precision:       ${precision.toFixed(2)}%`);
  console.log(`Recall:          ${recall.toFixed(2)}%\n`);

  if (accuracy < 80) {
    console.warn('⚠️ Warning: Accuracy is below the 80% baseline threshold.');
    process.exit(1); // Fail CI on low accuracy
  } else {
    console.log('✅ Baseline accuracy threshold met.');
    process.exit(0);
  }
}

// Check if TSX has registered the path aliases. If not, ts-node/tsx should be used with tsconfig-paths.
runEvaluation().catch(console.error);
