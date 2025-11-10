import { useState } from 'react'
import { useGlobalContextDispatch } from '@/features/context/useGlobalContext'
import { ManagmentRegister } from '@/features/actions/actionaManagment'
import { Machine } from '@/features/types/types'

export const useEquipmentForm = (agregarMaquina: (maquina: Machine) => Promise<string>) => {
  const dispatch = useGlobalContextDispatch()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Omit<Machine, 'id'>>({
    name: '',
    brand: '',
    model: '',
    purchaseDate: '',
    status: 'active',
    location: '',
    notes: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    /* agregarMaquina(formData) */
    /* const newMachine: Machine = {
      ...formData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    } */
   /*  dispatch({
      type: ManagmentRegister.MACHINE_REGISTER,
      payload: newMachine
    }) */
   /*  resetForm() */
  }

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model: '',
      purchaseDate: '',
      status: 'active',
      location: '',
      notes: ''
    })
    setShowForm(false)
  }

  const toggleForm = () => {
    setShowForm(prev => !prev)
  }

  return {
    showForm,
    formData,
    handleChange,
    handleSubmit,
    resetForm,
    toggleForm
  }
}

