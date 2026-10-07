/**
 * Вариант поля `Status` доски.
 */
export type StatusOption = {
  /**
   * Идентификатор варианта для мутации.
   */
  id: string;
  /**
   * Название варианта: Backlog, In progress и так далее.
   */
  name: string;
};

/**
 * Поле `Status` доски в ответе GraphQL: не однозначный выбор приходит пустым объектом.
 */
export type StatusField = {
  /**
   * Идентификатор поля для мутации.
   */
  id?: string;
  /**
   * Варианты поля.
   */
  options?: StatusOption[];
};

/**
 * Владелец доски: логин приходит у пользователя и организации, у остального типа — пустой
 * объект.
 */
export type OwnerNode = {
  /**
   * Логин владельца.
   */
  login?: string;
};

/**
 * Значение поля `Status` у карточки.
 */
export type StatusValueNode = {
  /**
   * Название выбранного варианта.
   */
  name?: string;
};

/**
 * Доска карточки в ответе GraphQL.
 */
export type ProjectNode = {
  /**
   * Идентификатор доски для мутации.
   */
  id: string;
  /**
   * Номер доски у владельца.
   */
  number: number;
  /**
   * Владелец доски.
   */
  owner: OwnerNode;
  /**
   * Поле `Status`; `null`, если у доски такого поля нет.
   */
  field: StatusField | null;
};

/**
 * Карточка issue на доске в форме ответа GraphQL.
 */
export type ProjectItemNode = {
  /**
   * Идентификатор карточки для мутации.
   */
  id: string;
  /**
   * Доска, на которой лежит карточка.
   */
  project: ProjectNode;
  /**
   * Текущее значение `Status`; `null`, если у карточки статуса нет.
   */
  status: StatusValueNode | null;
};

/**
 * Доска, которую ведёт скрипт.
 */
export type BoardTarget = {
  /**
   * Логин владельца доски.
   */
  owner: string;
  /**
   * Номер доски у владельца.
   */
  number: number;
};

/**
 * Всё, что нужно мутации `updateProjectV2ItemFieldValue`.
 */
export type BoardMove = {
  /**
   * Идентификатор доски.
   */
  projectId: string;
  /**
   * Идентификатор карточки.
   */
  itemId: string;
  /**
   * Идентификатор поля `Status`.
   */
  fieldId: string;
  /**
   * Идентификатор варианта In progress.
   */
  optionId: string;
};
