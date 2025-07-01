"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Edit3,
  Save,
  X,
  Check,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  validateResponse,
  type ValidationResult,
} from "@/lib/response-validator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
  console.log(response, "EditableResponse Props", response?.list_output);
  // --- State for each output type ---
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedOutputs, setEditedOutputs] = useState<{ [key: string]: string }>(
    {}
  );
  const [editedList, setEditedList] = useState<any[]>(
    safeCopy(response?.list_output, [])
  );
  const [editedMatrix, setEditedMatrix] = useState<any>(
    safeCopy(response?.matrix_output, {})
  );

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // ---- Enter Edit Mode ----
  const handleStartEdit = (field?: string) => {
    setValidation(null);
    setEditingField(field ?? null);
    if (blockType === "discretization") {
      setEditedOutputs({ ...response?.outputs }); // Defensive copy
    } else if (blockType === "single_list") {
      setEditedList(safeCopy(response?.list_output, []));
    } else if (blockType === "matrix" || blockType === "multi_list") {
      setEditedMatrix(safeCopy(response?.matrix_output, {}));
    } else {
      setEditedContent(response?.content ?? "");
    }
    setIsEditing(true);
  };

  useEffect(() => {
    if (blockType === "matrix" || blockType === "multi_list") {
      setEditedMatrix(safeCopy(response?.matrix_output, {}));
    }
  }, [response?.matrix_output, blockType]);

  useEffect(() => {
    if (blockType === "single_list") {
      setEditedList(safeCopy(response?.list_output, []));
    }
  }, [response?.list_output, blockType]);

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
      } else if (blockType === "single_list") {
        validationResult = await validateResponse(editedList, blockType);
      } else if (blockType === "matrix" || blockType === "multi_list") {
        validationResult = await validateResponse(
          editedMatrix.values || [],
          "multi_list"
        );
      } else {
        validationResult = await validateResponse(editedContent, blockType);
      }
      setValidation(validationResult);
      console.log("Validation Result:", validationResult);

      if (validationResult.isValid) {
        // Construct updatedResponse according to block type
        let updatedResponse: BlockResponse = {
          ...response!,
          editedAt: new Date().toISOString(),
        };

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
        console.log("Updated Response check:", updatedResponse);

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

  if (!response) {
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
            <Button
              size="sm"
              onClick={() => handleValidateAndSave()}
              disabled={isValidating}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isValidating}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-gray-700 cursor-pointer"
          onClick={() => handleStartEdit()}
        >
          {response?.content}
        </div>
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStartEdit(key)}
              >
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
                <Button
                  size="sm"
                  onClick={() => handleValidateAndSave(key)}
                  disabled={isValidating}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isValidating}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="text-gray-700 text-sm cursor-pointer"
              onClick={() => handleStartEdit(key)}
            >
              "{value}"
            </div>
          )}
        </div>
      ))}
    </div>
  );

  console.log("MATRIX RESPONSE DEBUG", { editedMatrix, response });

  console.log("Edited List:", editedList);
  // Minimal list/matrix editor for now (implement full table editor as needed)
  const renderList = () => (
    <div className="space-y-4">
      <h4 className="text-base font-medium">List Output:</h4>
      {editedList.map((item, idx) => (
        <div key={idx} className="mb-2">
          <label className="block text-xs text-gray-700 font-medium">
            Output #{idx + 1}
          </label>
          <Textarea
            value={item}
            onChange={(e) => {
              const newArr = [...editedList];
              newArr[idx] = e.target.value;
              setEditedList(newArr);
            }}
            rows={3}
            className="font-mono"
          />
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          onClick={() => handleValidateAndSave()}
          disabled={isValidating}
        >
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isValidating}
        >
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );

  const renderMatrix = () => {
    const matrix =
      (editedMatrix?.values && editedMatrix.values.length
        ? editedMatrix.values
        : response?.matrix_output?.values) || [];

    // Always use fallback "Col N" if missing or invalid
    const columnLabels =
      Array.isArray(response?.matrix_output?.labels) &&
      response.matrix_output.labels.length === matrix[0]?.length
        ? response.matrix_output.labels
        : matrix[0]?.length
        ? Array.from({ length: matrix[0].length }, (_, idx) => `Col ${idx + 1}`)
        : [];

    // Always use fallback "Row N" if missing or invalid
    const rowLabels =
      Array.isArray(response?.matrix_output?.rowLabels) &&
      response.matrix_output.rowLabels.length === matrix.length
        ? response.matrix_output.rowLabels
        : matrix.length
        ? Array.from({ length: matrix.length }, (_, idx) => `Row ${idx + 1}`)
        : [];

    // Cell update handler (for edit mode)
    function handleCellChange(rowIdx: number, colIdx: number, value: string) {
      const newMatrix = matrix.map((row: string[], i: number) =>
        i === rowIdx ? row.map((cell, j) => (j === colIdx ? value : cell)) : row
      );
      setEditedMatrix({ ...editedMatrix, values: newMatrix });
    }

    return (
      <div className="space-y-4">
        <h4 className="text-base font-medium">Matrix Output:</h4>
        <div className="rounded-xl shadow bg-white overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                {/* If row labels, show empty cell top left */}
                {rowLabels.length > 0 && <TableHead className="bg-gray-50" />}
                {columnLabels.map((label, idx) => (
                  <TableHead key={idx} className="bg-gray-50 font-semibold">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row: string[], rowIdx: number) => (
                <TableRow key={rowIdx} className="hover:bg-gray-50/70">
                  {rowLabels.length > 0 && (
                    <TableCell className="bg-gray-50 font-medium sticky left-0 z-10">
                      {rowLabels[rowIdx] ?? `Row ${rowIdx + 1}`}
                    </TableCell>
                  )}
                  {row.map((cell: string, colIdx: number) => (
                    <TableCell key={colIdx} className="align-top">
                      {isEditing ? (
                        <Textarea
                          value={cell}
                          onChange={(e) =>
                            handleCellChange(rowIdx, colIdx, e.target.value)
                          }
                          className="font-mono min-w-[160px] h-[80px] text-xs resize-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                          rows={3}
                        />
                      ) : (
                        <div className="min-w-[160px] whitespace-pre-line">
                          {cell}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Edit/Save buttons */}
        {isEditing ? (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() => handleValidateAndSave()}
              disabled={isValidating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isValidating}
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-1" /> Edit Matrix
            </Button>
          </div>
        )}
      </div>
    );
  };

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
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
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
  if (blockType === "single_list") return renderList();
  if (blockType === "multi_list" || blockType === "matrix")
    return renderMatrix();
  return <div>Unknown block type.</div>;
}
