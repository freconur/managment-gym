import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import { ChecklistItem, Machine, ChecklistAssignment } from '@/features/types/types';

interface ChecklistReportProps {
    monthName: string;
    currentMonth: number;
    year: number;
    machines: (Machine & { type?: string })[];
    assignments: ChecklistAssignment[];
    monthData: Record<string, Record<string, ChecklistItem>>;
    daysInMonth: number;
}

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 20,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#111827',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        color: '#6B7280',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#111827',
        textTransform: 'uppercase',
    },
    // Assignments Table Styles
    assignmentsTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 4,
        alignItems: 'center',
    },
    assignmentsTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 4,
        alignItems: 'center',
    },
    colAssignColor: {
        width: '5%',
        paddingLeft: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colAssignUser: {
        width: '35%',
        paddingLeft: 4,
        fontSize: 8,
        fontWeight: 'bold',
        color: '#374151',
    },
    colAssignLoc: {
        width: '30%',
        fontSize: 8,
        fontWeight: 'bold',
        color: '#374151',
    },
    colAssignDate: {
        width: '30%',
        fontSize: 8,
        fontWeight: 'bold',
        color: '#374151',
    },
    cellText: {
        fontWeight: 'normal',
        color: '#4B5563',
    },
    colorBox: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },

    // Table Styles
    table: {
        width: '100%',
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
        height: 15,
    },
    colIndex: {
        width: 15,
        fontSize: 6,
        textAlign: 'center',
        borderRightWidth: 0.5,
        borderRightColor: '#E5E7EB',
        paddingVertical: 2,
    },
    colName: {
        width: 100,
        fontSize: 6,
        paddingLeft: 4,
        paddingRight: 2,
        borderRightWidth: 0.5,
        borderRightColor: '#E5E7EB',
        justifyContent: 'center',
    },
    colDay: {
        flex: 1, // Distribute remaining space equally
        fontSize: 5,
        textAlign: 'center',
        borderRightWidth: 0.5,
        borderRightColor: '#E5E7EB',
        paddingVertical: 2,
        alignItems: 'center', // Center content (SVG)
        justifyContent: 'center',
    },
    checkIcon: {
        color: '#10B981', // Green
        fontSize: 6,
        textAlign: 'center',
    },
    crossIcon: {
        color: '#EF4444', // Red
        fontSize: 6,
        textAlign: 'center',
    },
    legend: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    legendItem: {
        fontSize: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    // Signatures Section
    signaturesSection: {
        marginTop: 30,
        width: '100%',
    },
    signaturesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginTop: 10,
    },
    signatureBlock: {
        width: '30%', // Fits 3 per row approx
        marginBottom: 20,
        alignItems: 'center',
        paddingTop: 40, // Space for signature above the line
    },
    signatureLine: {
        width: '100%',
        height: 1,
        backgroundColor: '#000',
        marginBottom: 5,
    },
    signatureText: {
        fontSize: 8,
        textAlign: 'center',
        color: '#374151',
    }
});

// SVG Icons using @react-pdf/renderer primitives
const Checkmark = () => (
    <Svg width={6} height={6} viewBox="0 0 24 24">
        <Path
            d="M20 6L9 17L4 12"
            stroke="#10B981"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const Crossmark = () => (
    <Svg width={6} height={6} viewBox="0 0 24 24">
        <Path d="M18 6L6 18" stroke="#EF4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6 6L18 18" stroke="#EF4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const Dash = () => (
    <Svg width={6} height={6} viewBox="0 0 24 24">
        <Path d="M5 12H19" stroke="#D1D5DB" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// Palette for assignments
const ASSIGNMENT_COLORS = ['#E0F2FE', '#FCE7F3', '#DCFCE7', '#FEF3C7', '#EDE9FE', '#FFEDD5'];

const getAssignmentColor = (index: number) => ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length];

const getAssignmentForDay = (day: number, currentMonth: number, currentYear: number, assignments: ChecklistAssignment[]) => {
    const date = new Date(currentYear, currentMonth, day);
    date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases

    return assignments.find(a => {
        // Parse "YYYY-MM-DD"
        const [startYear, startMonth, startDay] = a.startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = a.endDate.split('-').map(Number);

        const start = new Date(startYear, startMonth - 1, startDay);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endYear, endMonth - 1, endDay);
        end.setHours(23, 59, 59, 999);

        return date >= start && date <= end;
    });
};

export const ChecklistReportDocument: React.FC<ChecklistReportProps> = ({
    monthName,
    currentMonth,
    year,
    machines,
    assignments,
    monthData,
    daysInMonth
}) => {
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Filter unique users for signatures (based on DNI or ID)
    const uniqueUsersMap = new Map();
    assignments.forEach(a => {
        if (a.user && a.user.id && !uniqueUsersMap.has(a.user.id)) {
            uniqueUsersMap.set(a.user.id, a.user);
        }
    });
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    return (
        <Document>
            <Page size="A4" style={styles.page} orientation="portrait">
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>REPORTE MENSUAL DE EQUIPOS</Text>
                    <Text style={styles.subtitle}>{monthName} {year}</Text>
                </View>

                {/* Assignments Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ENCARGADOS DEL MES</Text>

                    {/* Table Header */}
                    <View style={styles.assignmentsTableHeader}>
                        <View style={styles.colAssignColor} />
                        <Text style={styles.colAssignUser}>Encargado</Text>
                        <Text style={styles.colAssignLoc}>Ubicación</Text>
                        <Text style={styles.colAssignDate}>Periodo</Text>
                    </View>

                    {/* Table Body */}
                    {assignments.length > 0 ? (
                        assignments.map((assignment, index) => (
                            <View key={index} style={styles.assignmentsTableRow}>
                                <View style={styles.colAssignColor}>
                                    <View style={[styles.colorBox, { backgroundColor: getAssignmentColor(index) }]} />
                                </View>
                                <Text style={[styles.colAssignUser, styles.cellText]}>
                                    {assignment.user?.nombres} {assignment.user?.apellidos}
                                </Text>
                                <Text style={[styles.colAssignLoc, styles.cellText]}>
                                    {assignment.gym || 'Global'}
                                </Text>
                                <Text style={[styles.colAssignDate, styles.cellText]}>
                                    {assignment.startDate} al {assignment.endDate}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.assignmentsTableRow}>
                            <View style={styles.colAssignColor} />
                            <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#6B7280', padding: 4 }}>
                                No hay encargados registrados para este mes.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Checklist Table */}
                <View style={styles.table}>
                    {/* Header Row Repeating */}
                    <View style={styles.tableHeader} fixed>
                        <Text style={styles.colIndex}>#</Text>
                        <Text style={styles.colName}>Equipo / Máquina</Text>
                        {daysArray.map(day => (
                            <Text key={day} style={styles.colDay}>{day}</Text>
                        ))}
                    </View>

                    {/* Table Body */}
                    {machines.map((machine, index) => {
                        const machineEntries = monthData[machine.id!] || {};

                        return (
                            <View key={machine.id || index} style={styles.tableRow} wrap={false}>
                                <Text style={styles.colIndex}>{index + 1}</Text>
                                <Text style={{ ...styles.colName, overflow: 'hidden' }}>{machine.name}</Text>
                                {daysArray.map(day => {
                                    const dayStr = String(day).padStart(2, '0');
                                    const entry = machineEntries[dayStr];

                                    // Determine background color based on assignment
                                    const assignment = getAssignmentForDay(day, currentMonth, year, assignments);
                                    const assignmentIndex = assignment ? assignments.indexOf(assignment) : -1;
                                    const bgColor = assignmentIndex !== -1 ? getAssignmentColor(assignmentIndex) : undefined;

                                    return (
                                        <View key={day} style={[styles.colDay, { backgroundColor: bgColor }]}>
                                            {entry ? (
                                                entry.status === 'ok' ? <Checkmark /> : <Crossmark />
                                            ) : (
                                                <Dash />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>

                {/* Legend */}
                <View style={styles.legend} fixed>
                    <View style={styles.legendItem}>
                        <Checkmark />
                        <Text>Operativo</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Crossmark />
                        <Text>Incidencia</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Dash />
                        <Text>Pendiente</Text>
                    </View>
                </View>

                {/* Signatures Section */}
                <View style={styles.signaturesSection} break={false} wrap={false}>
                    <Text style={styles.sectionTitle}>FIRMAS DE CONFORMIDAD</Text>
                    <View style={styles.signaturesGrid}>
                        {uniqueUsers.map((user, idx) => (
                            <View key={idx} style={styles.signatureBlock}>
                                <View style={styles.signatureLine} />
                                <Text style={styles.signatureText}>{user?.nombres} {user?.apellidos}</Text>
                                <Text style={styles.signatureText}>DNI: {user?.dni}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text
                    style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#9CA3AF' }}
                    render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )}
                    fixed
                />
            </Page>
        </Document>
    );
};
