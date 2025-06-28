"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit3, Save, X, Check, AlertTriangle, CheckCircle } from "lucide-react";
import { validateResponse, type ValidationResult } from "@/lib/response-validator";

interface BlockResponse {
  id: string;
  blockId: string;
  content: string;
  outputs?: { [key: string]: string };
  list_output?: any;
  matrix_output?: any;
  editedAt?: string;
}

interface EditableResponseProps {
  response: BlockResponse | null;
  blockType: string;
  onUpdate: (response: BlockResponse) => void;
}

// Utility: shallow copy to avoid undefined/nulls
function safeCopy<T>(val: T | undefined | null, def: T): T {
  return val ? JSON.parse(JSON.stringify(val)) : def;
}

export function EditableResponse({
  response,
  blockType,
  onUpdate,
}: EditableResponseProps) {
  // --- State for each output type ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedOutputs, setEditedOutputs] = useState<{ [key: string]: string }>({});
  const [editedList, setEditedList] = useState<any[]>(safeCopy(response?.list_output, []));
  const [editedMatrix, setEditedMatrix] = useState<any>(safeCopy(response?.matrix_output, {}));

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // ---- Enter Edit Mode ----
  const handleStartEdit = (field?: string) => {
    setValidation(null);
    setEditingField(field ?? null);
    if (blockType === "discretization") {
      setEditedOutputs({ ...response?.outputs }); // Defensive copy
    } else if (blockType === "single_list" || blockType === "multi_list") {
      setEditedList(safeCopy(response?.list_output, []));
    } else if (blockType === "matrix") {
      setEditedMatrix(safeCopy(response?.matrix_output, {}));
    } else {
      setEditedContent(response?.content ?? "");
    }
    setIsEditing(true);
  };

  // ---- Save Logic ----
  const handleValidateAndSave = async (field?: string) => {
    setIsValidating(true);
    try {
      let validationResult;
      if (blockType === "discretization" && field && response?.outputs) {
        validationResult = await validateResponse(
          editedOutputs[field] || "",
          blockType,
          { fieldName: field, isOutput: true }
        );
      } else {
        validationResult = await validateResponse(editedContent, blockType);
      }
      setValidation(validationResult);

      if (validationResult.isValid) {
        // Construct updatedResponse according to block type
        let updatedResponse: BlockResponse = { ...response!, editedAt: new Date().toISOString() };

        if (blockType === "standard") {
          updatedResponse.content = editedContent;
        } else if (blockType === "discretization") {
          updatedResponse.outputs = editingField
            ? { ...(response?.outputs ?? {}), ...editedOutputs }
            : response?.outputs ?? {};
        } else if (blockType === "single_list" || blockType === "multi_list") {
          updatedResponse.list_output = editedList;
        } else if (blockType === "matrix") {
          updatedResponse.matrix_output = editedMatrix;
        }
        console.log("Updated response:", updatedResponse);

        onUpdate(updatedResponse);
        setIsEditing(false);
        setEditingField(null);
        setValidation(null);
      }
    } catch (error) {
      setValidation({
        isValid: false,
        errors: ["Validation failed. Please try again."],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  // ---- Cancel Edit ----
  const handleCancel = () => {
    setValidation(null);
    setIsEditing(false);
    setEditingField(null);
    setEditedContent("");
    setEditedOutputs({});
    setEditedList(safeCopy(response?.list_output, []));
    setEditedMatrix(safeCopy(response?.matrix_output, {}));
  };

  // ---- Input Handlers ----
  const handleOutputChange = (outputKey: string, value: string) => {
    setEditedOutputs((prev) => ({
      ...prev,
      [outputKey]: value,
    }));
    if (validation) setValidation(null);
  };
  const handleContentChange = (value: string) => {
    setEditedContent(value);
    if (validation) setValidation(null);
  };
  // For lists/matrix, add similar update logic...
  console.log("coming hereee before erro", response, blockType, editedList, editedMatrix);

  if( !response ) {
    return <div className="text-gray-500">No response available.</div>;
  }
  // ---- Renderers ----
  const renderStandard = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-medium">Response:</h4>
        {!isEditing && (
          <Button size="sm" onClick={() => handleStartEdit()} variant="ghost">
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div>
          <Textarea
            value={editedContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Edit response..."
          />
          {renderValidationFeedback()}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => handleValidateAndSave()} disabled={isValidating}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isValidating}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-700 cursor-pointer" onClick={() => handleStartEdit()}>{response?.content}</div>
      )}
    </div>
  );

  const renderDiscretization = () => (
    <div className="space-y-4">
      <h4 className="text-base font-medium">Outputs:</h4>
      {Object.entries(response?.outputs ?? {}).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{key}:</span>
            {!isEditing && (
              <Button size="sm" variant="ghost" onClick={() => handleStartEdit(key)}>
                <Edit3 className="h-3 w-3" />
              </Button>
            )}
          </div>
          {isEditing && editingField === key ? (
            <div>
              <Textarea
                value={editedOutputs[key] ?? value}
                onChange={(e) => handleOutputChange(key, e.target.value)}
                placeholder={`Edit ${key}...`}
              />
              {renderValidationFeedback()}
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleValidateAndSave(key)} disabled={isValidating}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isValidating}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-gray-700 text-sm cursor-pointer" onClick={() => handleStartEdit(key)}>"{value}"</div>
          )}
        </div>
      ))}
    </div>
  );

  // Minimal list/matrix editor for now (implement full table editor as needed)
  const renderList = () => (
    <div className="space-y-4">
      <h4 className="text-base font-medium">List Output:</h4>
      <Textarea
        value={JSON.stringify(editedList, null, 2)}
        onChange={e => setEditedList(JSON.parse(e.target.value || "[]"))}
        className="font-mono"
        rows={4}
      />
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={() => handleValidateAndSave()} disabled={isValidating}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={isValidating}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );

  const renderMatrix = () => (
    <div className="space-y-4">
      <h4 className="text-base font-medium">Matrix Output:</h4>
      <Textarea
        value={JSON.stringify(editedMatrix, null, 2)}
        onChange={e => setEditedMatrix(JSON.parse(e.target.value || "{}"))}
        className="font-mono"
        rows={6}
      />
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={() => handleValidateAndSave()} disabled={isValidating}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={isValidating}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );

  function renderValidationFeedback() {
    if (!validation) return null;
    return (
      <div className="space-y-2">
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Validation Errors:</div>
              <ul className="list-disc ml-4">
                {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {validation.isValid && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Content validation passed successfully!
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // ---- Main return by blockType ----
  if (!response) return <div>No response yet.</div>;
  if (blockType === "standard") return renderStandard();
  if (blockType === "discretization") return renderDiscretization();
  if (blockType === "single_list" || blockType === "multi_list") return renderList();
  if (blockType === "matrix") return renderMatrix();
  return <div>Unknown block type.</div>;
}
