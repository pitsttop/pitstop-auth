import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Função para listar todos os clientes
export const listClients = async (searchTerm?: string) => {
  const whereClause: Prisma.ClientWhereInput = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { phone: { contains: searchTerm } },
        ],
      }
    : {};

  return await prisma.client.findMany({
    where: whereClause,
  });
};

// Função para criar um novo cliente
export const createClient = async (clientData: Prisma.ClientCreateInput) => {
  const client = await prisma.client.create({
    data: {
      name: clientData.name as string,
      phone: clientData.phone as string,
      email: clientData.email as string | undefined,
      // Note que 'password' não é incluído aqui!
    },
  });
  return client;
};

// Função para buscar um cliente por ID
export const findClientById = async (id: string) => {
  const client = await prisma.client.findUnique({
    where: { id: id },
  });
  return client;
};

// Função para atualizar os dados de um cliente
export const updateClient = async (
  id: string,
  clientData: Prisma.ClientUpdateInput
) => {
  return await prisma.client.update({
    where: { id: id },
    data: clientData,
  });
};

// Função para deletar um cliente
export const deleteClient = async (id: string) => {
  return await prisma.client.delete({
    where: { id: id },
  });
};
