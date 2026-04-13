export interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'RECEPTIONIST'
  | 'EXPENDITURE_RECEPTIONIST';

export interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  nameWithInitials: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  religion?: string;
  ethnicity?: string;
  nationality?: string;
  nic?: string;
  birthCertificateNo?: string;
  address: string;
  city: string;
  district: string;
  province: string;
  postalCode?: string;
  mobileNumber?: string;
  homePhone?: string;
  email?: string;
  classId: string;
  class: Class;
  admissionDate: string;
  previousSchool?: string;
  guardianName: string;
  guardianRelationship: string;
  guardianNIC: string;
  guardianPhone: string;
  guardianAddress?: string;
  guardianOccupation?: string;
  guardianEmail?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyRelationship: string;
  medicalConditions?: string;
  allergies?: string;
  status: string;
  profilePhoto?: string;
}

export interface StudentDetail extends Student {
  documents: StudentDocument[];
  feePayments: FeePayment[];
  attendance: Attendance[];
  examMarks: ExamMark[];
}

export interface StudentDocument {
  id: string;
  studentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface ExamMark {
  id: string;
  examId: string;
  exam: Exam;
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  designation: string;
  employmentType: string;
  mobileNumber: string;
  email?: string;
  joinedDate: string;
  status: string;
  qualifications: TeacherQualification[];
}

export interface TeacherQualification {
  id: string;
  qualification: string;
  institution: string;
  year: number;
  field?: string;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
  section?: string;
  capacity: number;
  academicYear: string;
}

export interface Attendance {
  id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK_LEAVE' | 'EXCUSED';

export interface FeePayment {
  id: string;
  studentId: string;
  student?: Student;
  feeType: 'MONTHLY' | 'EXAM' | 'ADMISSION' | 'OTHER';
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  dueDate: string;
  paymentDate?: string;
  receiptNumber?: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'ONLINE' | 'CHEQUE';
  remarks?: string;
  month?: string;
  academicYear: string;
}

export interface Exam {
  id: string;
  name: string;
  term: 'FIRST_TERM' | 'SECOND_TERM' | 'THIRD_TERM';
  classId: string;
  class?: Class;
  subject: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
  examFee?: number;
  academicYear: string;
}

export interface Inventory {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  location?: string;
  status: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  category?: string;
  createdBy: string;
  assignedTo?: string | User;
  creator?: User;
  assignee?: User;
  createdAt: string;
  completedAt?: string;
}

export interface Donation {
  id: string;
  donorName: string;
  amount: number;
  donationType: string;
  date: string;
  receiptNumber?: string;
}

export interface Expenditure {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  billNumber?: string;
  paymentMethod: string;
}

export interface DashboardStats {
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeStudents: number;
    activeTeachers: number;
  };
  todayAttendance: {
    students: {
      present: number;
      total: number;
      percentage: string;
    };
    teachers: {
      present: number;
      total: number;
      percentage: string;
    };
  };
  financial: {
    pendingFees: number;
    monthlyCollection: number;
  };
  alerts: {
    todos: number;
    urgentTodos: number;
    lowStockItems: number;
  };
  recentAdmissions: any[];
}
