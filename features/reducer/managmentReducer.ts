import { ManagmentAction } from "@/features/types/types"
import { Managment } from "@/features/types/types"
import { ManagmentRegister } from "@/features/actions/actionaManagment"


export const managmentGym = (state: Managment, action: ManagmentAction) => {
  switch (action.type) {
    case ManagmentRegister.MACHINE_REGISTER:
      return {
        ...state,
        machine: [...state.machine, action.payload]
      }
    case ManagmentRegister.MACHINE_UPDATE:
      return {
        ...state,
        machine: state.machine.map(m => 
          m.id === action.payload.id ? action.payload : m
        )
      }
    case ManagmentRegister.MACHINE_DELETE:
      return {
        ...state,
        machine: state.machine.filter(m => m.id !== action.payload.id)
      }
    default:
      return state
  }
}