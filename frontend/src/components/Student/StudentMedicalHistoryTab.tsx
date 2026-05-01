import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, Activity, Eye, Smile, AlertTriangle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { StudentMedicalHistory } from '../../types';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Modal } from '../UI/Modal';

interface StudentMedicalHistoryTabProps {
  studentId: string;
}

const StudentMedicalHistoryTab: React.FC<StudentMedicalHistoryTabProps> = ({ studentId }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: medicalHistory, isLoading } = useQuery<StudentMedicalHistory>({
    queryKey: ['studentMedicalHistory', studentId],
    queryFn: async () => {
      const response = await api.get(`/students/${studentId}/medical`);
      return response.data.data;
    },
    enabled: !!studentId,
  });

  // Effect to initialize state when modal opens or data loads
  React.useEffect(() => {
    if (medicalHistory) {
      setHeight(medicalHistory.height);
      setWeight(medicalHistory.weight);
    }
  }, [medicalHistory, isEditModalOpen]);

  const bmi = React.useMemo(() => {
    if (height && weight) {
      const heightInMeters = height / 100;
      return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
    }
    return undefined;
  }, [height, weight]);

  const upsertMutation = useMutation({
    mutationFn: async (data: Partial<StudentMedicalHistory>) => {
      const response = await api.put(`/students/${studentId}/medical`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentMedicalHistory', studentId] });
      toast.success('Medical history updated successfully');
      setIsEditModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to update medical history');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<StudentMedicalHistory> = {
      bloodGroup: formData.get('bloodGroup') as string,
      rhFactor: formData.get('rhFactor') as string,
      height: height,
      weight: weight,
      bmi: bmi,
      vision: formData.get('vision') as string,
      wearingGlasses: formData.get('wearingGlasses') === 'on',
      squintEye: formData.get('squintEye') as string,
      sight: formData.get('sight') as string,
      hearingProblem: formData.get('hearingProblem') as string,
      oralHygiene: formData.get('oralHygiene') as string,
      dentalCaries: formData.get('dentalCaries') === 'on',
      gumDisorder: formData.get('gumDisorder') === 'on',
      foodDrugAllergy: formData.get('foodDrugAllergy') === 'on',
      allergyDetails: formData.get('allergyDetails') as string,
      skinProblem: formData.get('skinProblem') === 'on',
      skinProblemDetails: formData.get('skinProblemDetails') as string,
      respiratoryProblem: formData.get('respiratoryProblem') === 'on',
      respiratoryDetails: formData.get('respiratoryDetails') as string,
      undergoneSurgery: formData.get('undergoneSurgery') === 'on',
      surgeryDetails: formData.get('surgeryDetails') as string,
      nervousProblem: formData.get('nervousProblem') === 'on',
      nervousDetails: formData.get('nervousDetails') as string,
      gastritis: formData.get('gastritis') === 'on',
      otherSickness: formData.get('otherSickness') as string,
      immunizationGiven: formData.get('immunizationGiven') === 'on',
      vaccineBcg: formData.get('vaccineBcg') === 'on',
      vaccinePolio: formData.get('vaccinePolio') === 'on',
      vaccineRubella: formData.get('vaccineRubella') === 'on',
      vaccineAtd: formData.get('vaccineAtd') === 'on',
      vaccineHpv: formData.get('vaccineHpv') === 'on',
      immunizationDetails: formData.get('immunizationDetails') as string,
    };
    upsertMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading medical history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Stethoscope className="text-blue-600" /> Comprehensive Medical History
        </h3>
        <Button onClick={() => setIsEditModalOpen(true)}>
          <Edit size={16} className="mr-2" /> Update Record
        </Button>
      </div>

      {!medicalHistory ? (
        <Card className="p-8 text-center bg-gray-50 border-dashed">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-700">No Medical Record Found</h4>
          <p className="text-gray-500 mt-2 mb-4">Click "Update Record" to add the comprehensive medical history.</p>
          <Button onClick={() => setIsEditModalOpen(true)} variant="secondary">Create Record</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Biometrics */}
          <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-blue-500">
            <h4 className="font-bold text-gray-800 border-b pb-2">01-02. Biometrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Blood Group:</span> <span className="font-medium">{medicalHistory.bloodGroup || '-'}</span></div>
              <div><span className="text-gray-500">Rh Factor:</span> <span className="font-medium">{medicalHistory.rhFactor || '-'}</span></div>
              <div><span className="text-gray-500">Height:</span> <span className="font-medium">{medicalHistory.height ? `${medicalHistory.height} cm` : '-'}</span></div>
              <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{medicalHistory.weight ? `${medicalHistory.weight} kg` : '-'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">BMI:</span> <span className="font-medium">{medicalHistory.bmi || '-'}</span></div>
            </div>
          </Card>

          {/* Sensory */}
          <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-purple-500">
            <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Eye size={18} /> 03-07. Sensory</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Vision:</span> <span className="font-medium">{medicalHistory.vision || '-'}</span></div>
              <div><span className="text-gray-500">Wearing Glass:</span> <span className="font-medium">{medicalHistory.wearingGlasses ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-500">Squint Eye:</span> <span className="font-medium">{medicalHistory.squintEye || '-'}</span></div>
              <div><span className="text-gray-500">Sight:</span> <span className="font-medium">{medicalHistory.sight || '-'}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Hearing Problem:</span> <span className="font-medium">{medicalHistory.hearingProblem || '-'}</span></div>
            </div>
          </Card>

          {/* Dental */}
          <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-teal-500">
            <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><Smile size={18} /> 08. Dental</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2"><span className="text-gray-500">Oral Hygiene:</span> <span className="font-medium">{medicalHistory.oralHygiene || '-'}</span></div>
              <div><span className="text-gray-500">Dental Caries:</span> <span className="font-medium">{medicalHistory.dentalCaries ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-500">Gum Disorder:</span> <span className="font-medium">{medicalHistory.gumDisorder ? 'Yes' : 'No'}</span></div>
            </div>
          </Card>

          {/* Allergies & Conditions */}
          <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-red-500 md:col-span-2">
            <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><AlertTriangle size={18} /> 09-13. Allergies & Conditions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <span className="text-gray-500">Food & Drugs Allergy:</span> 
                <span className={`ml-2 font-medium ${medicalHistory.foodDrugAllergy ? 'text-red-600' : ''}`}>{medicalHistory.foodDrugAllergy ? 'Yes' : 'No'}</span>
                {medicalHistory.foodDrugAllergy && <p className="mt-1 text-gray-700 bg-red-50 p-2 rounded">{medicalHistory.allergyDetails}</p>}
              </div>
              <div>
                <span className="text-gray-500">Skin Problem:</span> <span className="font-medium">{medicalHistory.skinProblem ? 'Yes' : 'No'}</span>
                {medicalHistory.skinProblem && <p className="mt-1 text-gray-700">{medicalHistory.skinProblemDetails}</p>}
              </div>
              <div>
                <span className="text-gray-500">Respiratory Problem:</span> <span className="font-medium">{medicalHistory.respiratoryProblem ? 'Yes' : 'No'}</span>
                {medicalHistory.respiratoryProblem && <p className="mt-1 text-gray-700">{medicalHistory.respiratoryDetails}</p>}
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500">Undergone Surgery:</span> <span className="font-medium">{medicalHistory.undergoneSurgery ? 'Yes' : 'No'}</span>
                {medicalHistory.undergoneSurgery && <p className="mt-1 text-gray-700">{medicalHistory.surgeryDetails}</p>}
              </div>
            </div>
          </Card>

           {/* Immunization & Others */}
           <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-green-500 md:col-span-2">
            <h4 className="font-bold text-gray-800 border-b pb-2">14-17. Immunization & Other</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-500 font-bold block mb-2">14. Immunization: <span className="font-medium font-normal">{medicalHistory.immunizationGiven ? 'Given' : 'Not Given'}</span></span>
                <div className="flex gap-4 flex-wrap">
                  <span className={`px-2 py-1 rounded ${medicalHistory.vaccineBcg ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>BCG</span>
                  <span className={`px-2 py-1 rounded ${medicalHistory.vaccinePolio ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>Polio</span>
                  <span className={`px-2 py-1 rounded ${medicalHistory.vaccineRubella ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>Rubella</span>
                  <span className={`px-2 py-1 rounded ${medicalHistory.vaccineAtd ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>ATD</span>
                  <span className={`px-2 py-1 rounded ${medicalHistory.vaccineHpv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>HPV</span>
                </div>
                {medicalHistory.immunizationDetails && <p className="mt-2 text-gray-700 text-xs">{medicalHistory.immunizationDetails}</p>}
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500">15. Nervous Problem:</span> <span className="font-medium">{medicalHistory.nervousProblem ? 'Yes' : 'No'}</span>
                  {medicalHistory.nervousProblem && <p className="mt-1 text-gray-700 text-xs">{medicalHistory.nervousDetails}</p>}
                </div>
                <div><span className="text-gray-500">16. Gastritis:</span> <span className="font-medium">{medicalHistory.gastritis ? 'Yes' : 'No'}</span></div>
                <div>
                  <span className="text-gray-500 block">17. Any other sickness:</span>
                  <p className="mt-1 font-medium bg-gray-50 p-2 rounded min-h-[40px]">{medicalHistory.otherSickness || 'None reported'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Comprehensive Medical History">
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pb-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">01. Blood Group</label>
              <select name="bloodGroup" defaultValue={medicalHistory?.bloodGroup} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select Group...</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rh Factor</label>
              <select name="rhFactor" defaultValue={medicalHistory?.rhFactor} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select Factor...</option>
                <option value="Positive">Positive (+)</option>
                <option value="Negative">Negative (-)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">02. Height (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                name="height" 
                value={height || ''} 
                onChange={(e) => setHeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                name="weight" 
                value={weight || ''} 
                onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">BMI</label>
              <input 
                type="number" 
                step="0.01" 
                name="bmi" 
                value={bmi || ''} 
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-50 p-2 text-sm font-bold text-blue-600 cursor-not-allowed" 
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">03. Vision</label>
              <select name="vision" defaultValue={medicalHistory?.vision} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select...</option>
                <option value="Good">Good</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="wearingGlasses" defaultChecked={medicalHistory?.wearingGlasses} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">04. Wearing Glass</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">05. Squint Eye</label>
              <select name="squintEye" defaultValue={medicalHistory?.squintEye} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select...</option>
                <option value="Right Eye">Right Eye</option>
                <option value="Left Eye">Left Eye</option>
                <option value="Both">Both</option>
                <option value="None">None</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">06. Sight</label>
              <select name="sight" defaultValue={medicalHistory?.sight} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select...</option>
                <option value="Short sightedness">Short sightedness</option>
                <option value="Long sightedness">Long sightedness</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">07. Hearing Problem</label>
              <select name="hearingProblem" defaultValue={medicalHistory?.hearingProblem} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                <option value="">Select...</option>
                <option value="Right Ear">Right Ear</option>
                <option value="Left Ear">Left Ear</option>
                <option value="Both">Both</option>
                <option value="None">None</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">08. Oral Hygiene</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="radio" name="oralHygiene" value="Satisfied" defaultChecked={medicalHistory?.oralHygiene === 'Satisfied'} /> Satisfied</label>
                <label className="flex items-center gap-2"><input type="radio" name="oralHygiene" value="Unsatisfied" defaultChecked={medicalHistory?.oralHygiene === 'Unsatisfied'} /> Unsatisfied</label>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="dentalCaries" defaultChecked={medicalHistory?.dentalCaries} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Dental Caries</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="gumDisorder" defaultChecked={medicalHistory?.gumDisorder} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Gum Disorder</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="foodDrugAllergy" defaultChecked={medicalHistory?.foodDrugAllergy} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-bold text-red-600">09. Food & Drugs Allergy</span>
              </label>
              <textarea name="allergyDetails" defaultValue={medicalHistory?.allergyDetails} placeholder="10. Allergic Food & drugs details..." className="w-full rounded-md border border-gray-300 p-2 text-sm min-h-[60px]"></textarea>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
             <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="skinProblem" defaultChecked={medicalHistory?.skinProblem} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">11. Skin Problem</span>
              </label>
              <input name="skinProblemDetails" defaultValue={medicalHistory?.skinProblemDetails} placeholder="Details..." className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="respiratoryProblem" defaultChecked={medicalHistory?.respiratoryProblem} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">12. Respiratory Problem</span>
              </label>
              <input name="respiratoryDetails" defaultValue={medicalHistory?.respiratoryDetails} placeholder="Details..." className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="undergoneSurgery" defaultChecked={medicalHistory?.undergoneSurgery} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">13. Undergone Surgery</span>
              </label>
              <input name="surgeryDetails" defaultValue={medicalHistory?.surgeryDetails} placeholder="Details..." className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
             <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" name="immunizationGiven" defaultChecked={medicalHistory?.immunizationGiven} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-bold text-gray-800">14. Immunization Given</span>
              </label>
              <div className="flex gap-4 flex-wrap bg-gray-50 p-3 rounded-md">
                <label className="flex items-center gap-2"><input type="checkbox" name="vaccineBcg" defaultChecked={medicalHistory?.vaccineBcg} /> BCG</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="vaccinePolio" defaultChecked={medicalHistory?.vaccinePolio} /> Polio</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="vaccineRubella" defaultChecked={medicalHistory?.vaccineRubella} /> Rubella</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="vaccineAtd" defaultChecked={medicalHistory?.vaccineAtd} /> ATD</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="vaccineHpv" defaultChecked={medicalHistory?.vaccineHpv} /> HPV</label>
              </div>
              <input name="immunizationDetails" defaultValue={medicalHistory?.immunizationDetails} placeholder="Other immunization details..." className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
             <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="nervousProblem" defaultChecked={medicalHistory?.nervousProblem} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">15. Nervous Problem</span>
              </label>
              <input name="nervousDetails" defaultValue={medicalHistory?.nervousDetails} placeholder="Details..." className="w-full rounded-md border border-gray-300 p-2 text-sm" />
            </div>
            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="gastritis" defaultChecked={medicalHistory?.gastritis} className="rounded text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">16. Gastritis</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium text-gray-700">17. Any other sickness or complaints</label>
            <textarea name="otherSickness" defaultValue={medicalHistory?.otherSickness} className="w-full rounded-md border border-gray-300 p-2 text-sm min-h-[80px]"></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4 sticky bottom-0 bg-white py-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentMedicalHistoryTab;
