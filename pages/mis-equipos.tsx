import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { EquiposTable } from '@/components/EquiposTable';
import { useManagment } from '@/features/hooks/useManagment';
import { Machine } from '@/features/types/types';
import { MachineDetailsModal } from '@/components/MachineDetailsModal';
import styles from '@/styles/equipment.module.css';

const MisEquipos = () => {
  const {
    getUbicaciones,
    ubicaciones,
    getMaquinas,
    maquinas,
    getMarcas,
    marcas,
    updateMaquinas,
    deleteMaquinas,
    validateSiEsAdmin,
  } = useManagment();

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasFetched = useRef(false);

  const handleOpenModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMachine(null);
  };

  const handleUpdateMachine = async (id: string, machine: Partial<Machine>) => {
    try {
      await updateMaquinas(id, machine);
      await getMaquinas();
      // Actualizar la máquina seleccionada con los nuevos datos
      if (selectedMachine && selectedMachine.id === id) {
        setSelectedMachine({ ...selectedMachine, ...machine });
      }
    } catch (error) {
      console.error('Error al actualizar máquina:', error);
      throw error;
    }
  };

  const handleDeleteMachine = async (id: string) => {
    try {
      await deleteMaquinas(id);
      await getMaquinas();
      // Cerrar el modal si la máquina eliminada era la seleccionada
      if (selectedMachine && selectedMachine.id === id) {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error al eliminar máquina:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      getMaquinas();
      hasFetched.current = true;
    }

    const unsubscribeUbicaciones = getUbicaciones();
    const unsubscribeMarcas = getMarcas();

    return () => {
      unsubscribeUbicaciones();
      unsubscribeMarcas();
    };
  }, [getUbicaciones, getMaquinas, getMarcas]);

  return (
    <>
      <Head>
        <title>Mis Equipos - Management Gym</title>
        <meta name="description" content="Mis equipos del gimnasio" />
      </Head>
      <main className={styles.main}>
        <EquiposTable
          maquinas={maquinas}
          ubicaciones={ubicaciones}
          onOpenModal={handleOpenModal}
          from="mis-equipos"
        />
      </main>
      <MachineDetailsModal
        isOpen={isModalOpen}
        machine={selectedMachine}
        onClose={handleCloseModal}
        onUpdate={handleUpdateMachine}
        onDelete={handleDeleteMachine}
        marcas={marcas}
        ubicaciones={ubicaciones}
        validateSiEsAdmin={validateSiEsAdmin}
      />
    </>
  );
};

export default MisEquipos;