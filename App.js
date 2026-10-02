import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';

/* =========================================================
   AUTOTECH VISION
   Banco de dados: Supabase
   ========================================================= */

const SUPABASE_URL =
  'https://lsknrcvdajnahxalxqfh.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_u4D6EZvyERDd3duJ8aYUag_6R-dVY-O';

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const CATEGORIAS = [
  'Todos',
  'Bandeja',
  'Pivô',
  'Bucha',
  'Coxim',
  'Outros',
];

const FORM_VAZIO = {
  codigo: '',
  nome: '',
  aplicacao: '',
  anos: '',
  lado: '',
  tipo: '',
  medidas: '',
  referencia_original: '',
  informacoes_tecnicas: '',
  alerta_tecnico: '',
  estoque: '0',
  localizacao: '',
  imagem_url: '',
  categoria: '',
};

/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

const limparCodigo = (texto) =>
  String(texto || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[._]/g, '-');

export default function App() {
  /* =======================================================
     ESTADOS
     ======================================================= */

  const [tela, setTela] = useState('inicio');

  const [busca, setBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] =
    useState(null);
  const [carregando, setCarregando] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [usuarioLogado, setUsuarioLogado] =
    useState(false);
  const [userId, setUserId] = useState('');
  const [adminAutorizado, setAdminAutorizado] =
    useState(false);

  // Formulário
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Gerenciamento
  const [produtosAdmin, setProdutosAdmin] = useState([]);
  const [buscaGerenciamento, setBuscaGerenciamento] =
    useState('');
  const [categoriaFiltro, setCategoriaFiltro] =
    useState('Todos');
  const [carregandoLista, setCarregandoLista] =
    useState(false);

  /* =======================================================
     PESQUISA DIRETA NO BANCO
     ======================================================= */

  const buscarProdutosGerenciamento = async (
    termoPesquisa = buscaGerenciamento,
    categoriaPesquisa = categoriaFiltro
  ) => {
    if (!adminAutorizado) {
      return;
    }

    setCarregandoLista(true);

    try {
      const termo = String(
        termoPesquisa || ''
      ).trim();

      let filtros = [];

      /* -----------------------------------------------
         PESQUISA POR CÓDIGO, NOME OU APLICAÇÃO
         ----------------------------------------------- */

      if (termo) {
        const termoSeguro = termo
          .replace(/[%]/g, '')
          .replace(/[,]/g, ' ');

        const busca = `*${termoSeguro}*`;

        const buscaCodificada =
          encodeURIComponent(
            `(codigo.ilike.${busca},nome.ilike.${busca},aplicacao.ilike.${busca})`
          );

        filtros.push(`or=${buscaCodificada}`);
      }

      /* -----------------------------------------------
         FILTRO POR CATEGORIA
         ----------------------------------------------- */

      if (
        categoriaPesquisa &&
        categoriaPesquisa !== 'Todos'
      ) {
        if (categoriaPesquisa === 'Outros') {
          const categoriaCodificada =
            encodeURIComponent('Outros');

          filtros.push(
            `or=${encodeURIComponent(
              `(categoria.eq.${categoriaCodificada},categoria.is.null)`
            )}`
          );
        } else {
          filtros.push(
            `categoria=eq.${encodeURIComponent(
              categoriaPesquisa
            )}`
          );
        }
      }

      /* -----------------------------------------------
         MONTA URL FINAL
         ----------------------------------------------- */

      let url =
        `${SUPABASE_URL}/rest/v1/produtos?` +
        `select=*`;

      if (filtros.length > 0) {
        url += `&${filtros.join('&')}`;
      }

      url += `&order=codigo.asc&limit=50`;

      const resposta = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.message ||
            dados?.hint ||
            'Erro ao pesquisar produtos.'
        );
      }

      setProdutosAdmin(dados || []);
    } catch (erro) {
      Alert.alert(
        'Erro na pesquisa',
        erro.message ||
          'Não foi possível pesquisar os produtos.'
      );
    } finally {
      setCarregandoLista(false);
    }
  };

  /* =======================================================
     PESQUISA AUTOMÁTICA AO DIGITAR
     ======================================================= */

  useEffect(() => {
    if (
      tela !== 'gerenciar' ||
      !adminAutorizado
    ) {
      return;
    }

    const temporizador = setTimeout(() => {
      buscarProdutosGerenciamento(
        buscaGerenciamento,
        categoriaFiltro
      );
    }, 350);

    return () => clearTimeout(temporizador);
  }, [
    buscaGerenciamento,
    categoriaFiltro,
    tela,
    adminAutorizado,
  ]);

  /* =======================================================
     PESQUISAR PRODUTO PARA CONSULTA
     ======================================================= */

  const pesquisarProduto = async () => {
    const codigo = limparCodigo(busca);

    if (!codigo) {
      Alert.alert(
        'Digite um código',
        'Digite o código da peça para pesquisar.'
      );
      return;
    }

    setCarregando(true);

    try {
      /* =====================================================
         1. PRIMEIRO PROCURA NA TABELA PRODUTOS
         ===================================================== */

      const respostaProdutos = await fetch(
        `${SUPABASE_URL}/rest/v1/produtos?codigo=eq.${encodeURIComponent(
          codigo
        )}&ativo=eq.true&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const dadosProdutos =
        await respostaProdutos.json();

      if (!respostaProdutos.ok) {
        throw new Error(
          dadosProdutos?.message ||
            dadosProdutos?.hint ||
            'Erro ao consultar produtos.'
        );
      }

      /* =====================================================
         SE ENCONTROU EM PRODUTOS
         ===================================================== */

      if (dadosProdutos.length > 0) {
        setProdutoSelecionado(
          dadosProdutos[0]
        );

        return;
      }

      /* =====================================================
         2. SE NÃO ENCONTROU, PROCURA NA TABELA PIVOS
         ===================================================== */

      const respostaPivos = await fetch(
        `${SUPABASE_URL}/rest/v1/pivos?codigo=eq.${encodeURIComponent(
          codigo
        )}&ativo=eq.true&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const dadosPivos =
        await respostaPivos.json();

      if (!respostaPivos.ok) {
        throw new Error(
          dadosPivos?.message ||
            dadosPivos?.hint ||
            'Erro ao consultar pivôs.'
        );
      }

      /* =====================================================
         NENHUM PRODUTO E NENHUM PIVÔ
         ===================================================== */

      if (!dadosPivos.length) {
        Alert.alert(
          'Peça não encontrada',
          `Não encontrei o código ${codigo}.`
        );

        setProdutoSelecionado(null);
        return;
      }

      /* =====================================================
         ORGANIZA OS DADOS DOS PIVÔS
         ===================================================== */

      const marcas = [
        ...new Set(
          dadosPivos
            .map((item) => item.marca)
            .filter(Boolean)
        ),
      ];

      const modelos = [
        ...new Set(
          dadosPivos
            .map((item) => item.modelo)
            .filter(Boolean)
        ),
      ];

      const aplicacoes = [
        ...new Set(
          dadosPivos
            .map((item) => item.aplicacao)
            .filter(Boolean)
        ),
      ];

      const lados = [
        ...new Set(
          dadosPivos
            .map((item) => item.lado)
            .filter(Boolean)
        ),
      ];

      const detalhes = [
        ...new Set(
          dadosPivos
            .map((item) => item.detalhe)
            .filter(Boolean)
        ),
      ];

      const referencias = [
        ...new Set(
          dadosPivos
            .map(
              (item) =>
                item.referencia_original
            )
            .filter(Boolean)
        ),
      ];

      const nomes = [
        ...new Set(
          dadosPivos
            .map((item) => item.nome)
            .filter(Boolean)
        ),
      ];

      const origens = [
        ...new Set(
          dadosPivos
            .map((item) => item.origem)
            .filter(Boolean)
        ),
      ];

      const precos = [
        ...new Set(
          dadosPivos
            .map((item) => item.preco)
            .filter(Boolean)
        ),
      ];

      /* =====================================================
         MONTA A FICHA DO PIVÔ
         ===================================================== */

      const pivo = {
        id: dadosPivos[0].id,

        codigo: codigo,

        categoria: 'Pivô',

        nome:
          nomes.join(' | ') ||
          `Pivô ${codigo}`,

        aplicacao:
          aplicacoes.join(' | ') ||
          'Não informada.',

        anos: '',

        lado:
          lados.join(' | ') ||
          'Não informado',

        tipo: 'Pivô',

        medidas:
          detalhes.join(' | ') ||
          'Não informadas',

        referencia_original:
          referencias.join(' | ') ||
          'Não informada',

        informacoes_tecnicas:
          marcas.length > 0
            ? `Marca: ${marcas.join(
                ' | '
              )}${
                modelos.length > 0
                  ? `\nModelo: ${modelos.join(
                      ' | '
                    )}`
                  : ''
              }`
            : modelos.length > 0
            ? `Modelo: ${modelos.join(
                ' | '
              )}`
            : 'Não informadas.',

        alerta_tecnico:
          'Confira a aplicação, lado, posição e medida antes da instalação.',

        estoque: 0,

        localizacao:
          'Não cadastrada',

        imagem_url:
          dadosPivos.find(
            (item) =>
              item.imagem_url
          )?.imagem_url || '',

        origem:
          origens.join(' | '),

        preco:
          precos.join(' | '),
      };

      setProdutoSelecionado(
        pivo
      );
    } catch (erro) {
      Alert.alert(
        'Erro',
        erro.message ||
          'Não foi possível consultar o produto.'
      );
    } finally {
      setCarregando(false);
    }
  };

  /* =======================================================
     LOGIN ADMIN
     ======================================================= */

  const fazerLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert(
        'Preencha os campos',
        'Digite o e-mail e a senha.'
      );
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password: senha,
          }),
        }
      );

      const login = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          login?.error_description ||
            login?.msg ||
            'E-mail ou senha incorretos.'
        );
      }

      const token = login.access_token;
      const id = login.user?.id;

      if (!token || !id) {
        throw new Error(
          'Não foi possível identificar o usuário.'
        );
      }

      const respostaAdmin = await fetch(
        `${SUPABASE_URL}/rest/v1/admins?user_id=eq.${id}&select=user_id`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const administradores =
        await respostaAdmin.json();

      if (!respostaAdmin.ok) {
        throw new Error(
          'Não foi possível verificar a autorização administrativa.'
        );
      }

      if (!administradores.length) {
        Alert.alert(
          'Acesso não autorizado',
          'Este usuário existe, mas não está cadastrado como administrador.'
        );
        return;
      }

      setUserId(id);
      setUsuarioLogado(true);
      setAdminAutorizado(true);
      setSenha('');
      setTela('admin');

      Alert.alert(
        'Acesso autorizado',
        'Você entrou na área administrativa.'
      );
    } catch (erro) {
      Alert.alert(
        'Erro no login',
        erro.message ||
          'Não foi possível entrar.'
      );
    } finally {
      setCarregando(false);
    }
  };

  /* =======================================================
     ABRIR GERENCIAMENTO
     ======================================================= */

  const carregarProdutosAdmin = async () => {
    if (!adminAutorizado) {
      Alert.alert(
        'Acesso necessário',
        'Entre primeiro na área administrativa.'
      );
      return;
    }

    setBuscaGerenciamento('');
    setCategoriaFiltro('Todos');

    setTela('gerenciar');

    await buscarProdutosGerenciamento(
      '',
      'Todos'
    );
  };

  /* =======================================================
     ABRIR CADASTRO
     ======================================================= */

  const abrirCadastro = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setTela('cadastro');
  };

  /* =======================================================
     ABRIR EDIÇÃO
     ======================================================= */

  const abrirEdicao = (produto) => {
    setEditandoId(produto.id);

    setForm({
      codigo: produto.codigo || '',
      nome: produto.nome || '',
      aplicacao: produto.aplicacao || '',
      anos: produto.anos || '',
      lado: produto.lado || '',
      tipo: produto.tipo || '',
      medidas: produto.medidas || '',
      referencia_original:
        produto.referencia_original || '',
      informacoes_tecnicas:
        produto.informacoes_tecnicas || '',
      alerta_tecnico:
        produto.alerta_tecnico || '',
      estoque: String(
        produto.estoque ?? 0
      ),
      localizacao:
        produto.localizacao || '',
      imagem_url:
        produto.imagem_url || '',
      categoria:
        produto.categoria || '',
    });

    setTela('cadastro');
  };

  /* =======================================================
     SALVAR PRODUTO
     ======================================================= */

  const salvarProduto = async () => {
    if (!form.codigo.trim()) {
      Alert.alert(
        'Código obrigatório',
        'Digite o código da peça.'
      );
      return;
    }

    if (!form.nome.trim()) {
      Alert.alert(
        'Nome obrigatório',
        'Digite o nome da peça.'
      );
      return;
    }

    if (!form.categoria) {
      Alert.alert(
        'Categoria obrigatória',
        'Escolha uma categoria para o produto.'
      );
      return;
    }

    setSalvando(true);

    try {
      const codigoFinal =
        limparCodigo(form.codigo);

      const produto = {
        codigo: codigoFinal,
        nome: form.nome.trim(),
        aplicacao:
          form.aplicacao.trim(),
        anos: form.anos.trim(),
        lado: form.lado.trim(),
        tipo: form.tipo.trim(),
        medidas: form.medidas.trim(),
        referencia_original:
          form.referencia_original.trim(),
        informacoes_tecnicas:
          form.informacoes_tecnicas.trim(),
        alerta_tecnico:
          form.alerta_tecnico.trim(),
        estoque:
          Number(form.estoque) || 0,
        localizacao:
          form.localizacao.trim(),
        imagem_url:
          form.imagem_url.trim(),
        categoria:
          form.categoria,
        ativo: true,
      };

      let resposta;

      if (editandoId) {
        resposta = await fetch(
          `${SUPABASE_URL}/rest/v1/produtos?id=eq.${editandoId}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(produto),
          }
        );
      } else {
        resposta = await fetch(
          `${SUPABASE_URL}/rest/v1/produtos`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(produto),
          }
        );
      }

      const resultado =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.message ||
            resultado?.hint ||
            'Não foi possível salvar o produto.'
        );
      }

      Alert.alert(
        editandoId
          ? 'Produto atualizado'
          : 'Produto cadastrado',
        editandoId
          ? 'As alterações foram salvas no banco de dados.'
          : 'O produto foi cadastrado com sucesso.'
      );

      setForm(FORM_VAZIO);
      setEditandoId(null);

      if (editandoId) {
        setTela('gerenciar');

        await buscarProdutosGerenciamento(
          '',
          'Todos'
        );
      } else {
        setTela('admin');
      }
    } catch (erro) {
      Alert.alert(
        'Erro ao salvar',
        erro.message ||
          'Não foi possível salvar.'
      );
    } finally {
      setSalvando(false);
    }
  };

  /* =======================================================
     SAIR DO ADMIN
     ======================================================= */

  const sairAdmin = () => {
    setUsuarioLogado(false);
    setAdminAutorizado(false);
    setUserId('');
    setProdutosAdmin([]);
    setBuscaGerenciamento('');
    setCategoriaFiltro('Todos');
    setTela('inicio');
  };

  /* =======================================================
     COMPONENTE DE CAMPO
     ======================================================= */

  const Campo = ({
    label,
    campo,
    placeholder,
    multiline = false,
    keyboardType = 'default',
  }) => (
    <View style={styles.campoContainer}>
      <Text style={styles.campoLabel}>
        {label}
      </Text>

      <TextInput
        value={form[campo]}
        onChangeText={(valor) =>
          setForm((anterior) => ({
            ...anterior,
            [campo]: valor,
          }))
        }
        placeholder={placeholder}
        placeholderTextColor="#718096"
        style={[
          styles.campoInput,
          multiline &&
            styles.campoMultiline,
        ]}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={
          campo === 'codigo'
            ? 'characters'
            : 'sentences'
        }
      />
    </View>
  );

  /* =======================================================
     TELA INICIAL
     ======================================================= */

  const renderInicio = () => (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            AUTOTECH
          </Text>

          <Text style={styles.subLogo}>
            VISION • SISTEMA TÉCNICO
          </Text>
        </View>

        <Pressable
          style={styles.adminButton}
          onPress={() =>
            setTela('login')
          }
        >
          <Text style={styles.adminButtonText}>
            ADMIN
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.label}>
          CONSULTAR CÓDIGO DA PEÇA
        </Text>

        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Ex.: BDN14010"
          placeholderTextColor="#8995a7"
          autoCapitalize="characters"
          style={styles.input}
          onSubmitEditing={
            pesquisarProduto
          }
        />

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={
            pesquisarProduto
          }
          disabled={carregando}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {carregando
              ? 'PESQUISANDO...'
              : 'PESQUISAR PEÇA'}
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.voiceButton
          }
          onPress={() =>
            Alert.alert(
              'Pesquisa por voz',
              'A função de voz ficará nesta área. A integração real será feita na próxima etapa.'
            )
          }
        >
          <Text
            style={
              styles.voiceIcon
            }
          >
            ●
          </Text>

          <Text
            style={
              styles.voiceText
            }
          >
            PESQUISAR POR VOZ
          </Text>
        </Pressable>
      </View>

      {produtoSelecionado ? (
        <View
          style={
            styles.productCard
          }
        >
          <Text
            style={
              styles.codeLabel
            }
          >
            CÓDIGO
          </Text>

          <Text
            style={styles.code}
          >
            {
              produtoSelecionado.codigo
            }
          </Text>

          <Text
            style={
              styles.productName
            }
          >
            {produtoSelecionado.nome ||
              'Produto sem nome'}
          </Text>

          {produtoSelecionado.categoria ? (
            <View
              style={
                styles.categoryBadge
              }
            >
              <Text
                style={
                  styles.categoryBadgeText
                }
              >
                {
                  produtoSelecionado.categoria
                }
              </Text>
            </View>
          ) : null}

          <Text
            style={
              styles.sectionTitle
            }
          >
            APLICAÇÃO
          </Text>

          <Text
            style={
              styles.productText
            }
          >
            {
              produtoSelecionado.aplicacao ||
              'Não informada.'
            }
          </Text>

          <View
            style={styles.grid}
          >
            <Info
              label="ANOS"
              value={
                produtoSelecionado.anos
              }
            />

            <Info
              label="LADO"
              value={
                produtoSelecionado.lado
              }
            />

            <Info
              label="TIPO"
              value={
                produtoSelecionado.tipo
              }
            />

            <Info
              label="MEDIDAS"
              value={
                produtoSelecionado.medidas
              }
            />

            <Info
              label="REFERÊNCIA ORIGINAL"
              value={
                produtoSelecionado.referencia_original
              }
            />
          </View>

          <Text
            style={
              styles.sectionTitle
            }
          >
            INFORMAÇÕES TÉCNICAS
          </Text>

          <View
            style={
              styles.infoLarge
            }
          >
            <Text
              style={
                styles.infoValue
              }
            >
              {
                produtoSelecionado.informacoes_tecnicas ||
                'Não informado.'
              }
            </Text>
          </View>

          <View
            style={styles.warning}
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              ⚠ AVISO TÉCNICO
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              {
                produtoSelecionado.alerta_tecnico ||
                'Nenhum aviso técnico cadastrado.'
              }
            </Text>
          </View>

          <View
            style={
              styles.stockRow
            }
          >
            <View
              style={
                styles.stockBox
              }
            >
              <Text
                style={
                  styles.stockLabel
                }
              >
                ESTOQUE
              </Text>

              <Text
                style={
                  styles.stockValue
                }
              >
                {
                  produtoSelecionado.estoque ??
                  0
                }
              </Text>
            </View>

            <View
              style={
                styles.stockBox
              }
            >
              <Text
                style={
                  styles.stockLabel
                }
              >
                LOCALIZAÇÃO
              </Text>

              <Text
                style={
                  styles.stockValueSmall
                }
              >
                {
                  produtoSelecionado.localizacao ||
                  'Não informada'
                }
              </Text>
            </View>
          </View>

          {produtoSelecionado.imagem_url ? (
            <Image
              source={{
                uri:
                  produtoSelecionado.imagem_url,
              }}
              style={
                styles.productImage
              }
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.imagePlaceholder
              }
            >
              <Text
                style={
                  styles.imageTitle
                }
              >
                IMAGEM TÉCNICA
              </Text>

              <Text
                style={
                  styles.imageText
                }
              >
                Imagem técnica ainda não cadastrada.
              </Text>
            </View>
          )}

          <Pressable
            style={
              styles.listenButton
            }
            onPress={() =>
              Alert.alert(
                'Ouvir informações',
                'A função de leitura por voz será ativada posteriormente.'
              )
            }
          >
            <Text
              style={
                styles.listenText
              }
            >
              OUVIR INFORMAÇÕES
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={styles.empty}
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            CONSULTA TÉCNICA
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Digite o código da peça acima para consultar
            as informações técnicas cadastradas.
          </Text>
        </View>
      )}

      <Text
        style={styles.footer}
      >
        AUTOTECH VISION • SISTEMA TÉCNICO
      </Text>
    </ScrollView>
  );

  /* =======================================================
     TELA LOGIN
     ======================================================= */

  const renderLogin = () => (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <View
        style={
          styles.innerHeader
        }
      >
        <Text
          style={
            styles.screenTitle
          }
        >
          ÁREA ADMINISTRATIVA
        </Text>

        <Text
          style={
            styles.screenSubtitle
          }
        >
          Acesso restrito para gerenciamento dos produtos.
        </Text>
      </View>

      <View
        style={styles.formCard}
      >
        <Text
          style={
            styles.campoLabel
          }
        >
          E-MAIL
        </Text>

        <TextInput
          value={email}
          onChangeText={
            setEmail
          }
          placeholder="Digite seu e-mail"
          placeholderTextColor="#718096"
          style={
            styles.campoInput
          }
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text
          style={
            styles.campoLabel
          }
        >
          SENHA
        </Text>

        <TextInput
          value={senha}
          onChangeText={
            setSenha
          }
          placeholder="Digite sua senha"
          placeholderTextColor="#718096"
          style={
            styles.campoInput
          }
          secureTextEntry
        />

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={
            fazerLogin
          }
          disabled={carregando}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            {carregando
              ? 'ENTRANDO...'
              : 'ENTRAR'}
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={() =>
            setTela('inicio')
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            VOLTAR
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  /* =======================================================
     TELA ADMIN
     ======================================================= */

  const renderAdmin = () => (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <View
        style={
          styles.adminHeader
        }
      >
        <View>
          <Text
            style={
              styles.screenTitle
            }
          >
            ADMINISTRAÇÃO
          </Text>

          <Text
            style={
              styles.screenSubtitle
            }
          >
            Gerencie os produtos técnicos do sistema.
          </Text>
        </View>

        <Pressable
          style={
            styles.logoutButton
          }
          onPress={
            sairAdmin
          }
        >
          <Text
            style={
              styles.logoutText
            }
          >
            SAIR
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.adminMenuCard
        }
      >
        <Text
          style={
            styles.adminMenuTitle
          }
        >
          PRODUTOS
        </Text>

        <Text
          style={
            styles.adminMenuText
          }
        >
          Cadastre novos produtos ou procure produtos já
          cadastrados para editar.
        </Text>

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={
            abrirCadastro
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            + CADASTRAR NOVO PRODUTO
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.searchManageButton
          }
          onPress={
            carregarProdutosAdmin
          }
          disabled={
            carregandoLista
          }
        >
          <Text
            style={
              styles.searchManageIcon
            }
          >
            🔎
          </Text>

          <Text
            style={
              styles.searchManageText
            }
          >
            {carregandoLista
              ? 'CARREGANDO PRODUTOS...'
              : 'PESQUISAR / GERENCIAR PRODUTOS'}
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.infoNotice
        }
      >
        <Text
          style={
            styles.infoNoticeTitle
          }
        >
          COMO FUNCIONA
        </Text>

        <Text
          style={
            styles.infoNoticeText
          }
        >
          A lupa pesquisa diretamente no banco pelo código,
          nome ou aplicação. Você também pode filtrar pela
          categoria.
        </Text>
      </View>
    </ScrollView>
  );

  /* =======================================================
     TELA GERENCIAR PRODUTOS
     ======================================================= */

  const renderGerenciar = () => (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.innerHeader
        }
      >
        <View
          style={styles.backRow}
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              setTela('admin')
            }
          >
            <Text
              style={
                styles.backText
              }
            >
              ← VOLTAR
            </Text>
          </Pressable>
        </View>

        <Text
          style={
            styles.screenTitle
          }
        >
          🔎 GERENCIAR PRODUTOS
        </Text>

        <Text
          style={
            styles.screenSubtitle
          }
        >
          Pesquisa direta no banco de dados
        </Text>
      </View>

      <View
        style={
          styles.manageSearchCard
        }
      >
        <Text
          style={
            styles.campoLabel
          }
        >
          PESQUISAR PRODUTO
        </Text>

        <TextInput
          value={
            buscaGerenciamento
          }
          onChangeText={
            setBuscaGerenciamento
          }
          placeholder="Código, nome ou aplicação..."
          placeholderTextColor="#718096"
          style={
            styles.campoInput
          }
          autoCapitalize="characters"
        />

        <Text
          style={
            styles.searchHint
          }
        >
          Ex.: BDN14010, Bandeja, Corolla, suspensão...
        </Text>

        <Text
          style={
            styles.campoLabel
          }
        >
          FILTRAR POR CATEGORIA
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={
            styles.categoryScroll
          }
        >
          {CATEGORIAS.map(
            (categoria) => {
              const selecionada =
                categoriaFiltro ===
                categoria;

              return (
                <Pressable
                  key={
                    categoria
                  }
                  style={[
                    styles.categoryButton,
                    selecionada &&
                      styles.categoryButtonSelected,
                  ]}
                  onPress={() =>
                    setCategoriaFiltro(
                      categoria
                    )
                  }
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selecionada &&
                        styles.categoryButtonTextSelected,
                    ]}
                  >
                    {categoria}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>
      </View>

      <View
        style={
          styles.resultsHeader
        }
      >
        <Text
          style={
            styles.resultsTitle
          }
        >
          RESULTADOS
        </Text>

        <Text
          style={
            styles.resultsCount
          }
        >
          {carregandoLista
            ? '...'
            : produtosAdmin.length}
        </Text>
      </View>

      {carregandoLista &&
      produtosAdmin.length === 0 ? (
        <View
          style={
            styles.empty
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            PESQUISANDO...
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Consultando o banco de dados.
          </Text>
        </View>
      ) : produtosAdmin.length ===
        0 ? (
        <View
          style={
            styles.empty
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            NENHUM PRODUTO ENCONTRADO
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            Tente outro código, nome, aplicação ou categoria.
          </Text>
        </View>
      ) : (
        produtosAdmin.map(
          (produto) => (
            <View
              key={
                produto.id
              }
              style={
                styles.adminProductCard
              }
            >
              <View
                style={
                  styles.adminProductTop
                }
              >
                <View
                  style={
                    styles.adminProductInfo
                  }
                >
                  <Text
                    style={
                      styles.adminProductCode
                    }
                  >
                    {
                      produto.codigo
                    }
                  </Text>

                  <Text
                    style={
                      styles.adminProductName
                    }
                  >
                    {produto.nome ||
                      'Nome não informado'}
                  </Text>

                  <Text
                    style={
                      styles.adminProductApplication
                    }
                  >
                    {produto.aplicacao ||
                      'Aplicação não informada'}
                  </Text>

                  <View
                    style={
                      styles.adminProductMeta
                    }
                  >
                    <Text
                      style={
                        styles.adminMetaText
                      }
                    >
                      Categoria:{' '}
                      {produto.categoria ||
                        'Sem categoria'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={
                    styles.editButton
                  }
                  onPress={() =>
                    abrirEdicao(
                      produto
                    )
                  }
                >
                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    EDITAR
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        )
      )}

      {produtosAdmin.length >=
        50 ? (
        <View
          style={
            styles.limitNotice
          }
        >
          <Text
            style={
              styles.limitNoticeText
            }
          >
            Mostrando os primeiros 50 resultados.
            Refine a pesquisa para encontrar uma peça específica.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );

  /* =======================================================
     TELA CADASTRO / EDIÇÃO
     ======================================================= */

  const renderCadastro = () => (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={
          styles.innerHeader
        }
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={() => {
            if (editandoId) {
              setTela(
                'gerenciar'
              );
            } else {
              setTela('admin');
            }
          }}
        >
          <Text
            style={
              styles.backText
            }
          >
            ← VOLTAR
          </Text>
        </Pressable>

        <Text
          style={
            styles.screenTitle
          }
        >
          {editandoId
            ? 'EDITAR PRODUTO'
            : 'CADASTRAR PRODUTO'}
        </Text>

        <Text
          style={
            styles.screenSubtitle
          }
        >
          {editandoId
            ? 'Altere as informações e salve.'
            : 'Preencha as informações técnicas da peça.'}
        </Text>
      </View>

      <View
        style={
          styles.formCard
        }
      >
        <Campo
          label="CÓDIGO DA PEÇA *"
          campo="codigo"
          placeholder="Ex.: BDN14010"
        />

        <Campo
          label="NOME DA PEÇA *"
          campo="nome"
          placeholder="Ex.: Bandeja de suspensão"
        />

        <Text
          style={
            styles.campoLabel
          }
        >
          CATEGORIA *
        </Text>

        <View
          style={
            styles.categoryFormContainer
          }
        >
          {CATEGORIAS.filter(
            (categoria) =>
              categoria !== 'Todos'
          ).map(
            (categoria) => {
              const selecionada =
                form.categoria ===
                categoria;

              return (
                <Pressable
                  key={
                    categoria
                  }
                  style={[
                    styles.categoryFormButton,
                    selecionada &&
                      styles.categoryFormButtonSelected,
                  ]}
                  onPress={() =>
                    setForm(
                      (anterior) => ({
                        ...anterior,
                        categoria,
                      })
                    )
                  }
                >
                  <Text
                    style={[
                      styles.categoryFormText,
                      selecionada &&
                        styles.categoryFormTextSelected,
                    ]}
                  >
                    {categoria}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        <Campo
          label="APLICAÇÃO"
          campo="aplicacao"
          placeholder="Veículos / modelos / motores"
          multiline
        />

        <Campo
          label="ANO(S)"
          campo="anos"
          placeholder="Ex.: 2012–2018"
        />

        <Campo
          label="LADO"
          campo="lado"
          placeholder="Ex.: Direito / Esquerdo"
        />

        <Campo
          label="TIPO"
          campo="tipo"
          placeholder="Ex.: Bandeja dianteira"
        />

        <Campo
          label="MEDIDAS"
          campo="medidas"
          placeholder="Ex.: Furo principal 16 mm"
          multiline
        />

        <Campo
          label="REFERÊNCIA ORIGINAL"
          campo="referencia_original"
          placeholder="Código original da montadora"
        />

        <Campo
          label="INFORMAÇÕES TÉCNICAS"
          campo="informacoes_tecnicas"
          placeholder="Informações técnicas da peça"
          multiline
        />

        <Campo
          label="⚠ AVISO TÉCNICO"
          campo="alerta_tecnico"
          placeholder="Cuidados, diferenças, orientação..."
          multiline
        />

        <Campo
          label="ESTOQUE"
          campo="estoque"
          placeholder="0"
          keyboardType="numeric"
        />

        <Campo
          label="LOCALIZAÇÃO"
          campo="localizacao"
          placeholder="Ex.: Corredor 03 / Prateleira B"
        />

        <Campo
          label="IMAGEM TÉCNICA — URL"
          campo="imagem_url"
          placeholder="Cole aqui o link da imagem"
          multiline
        />

        <Pressable
          style={
            styles.saveButton
          }
          onPress={
            salvarProduto
          }
          disabled={
            salvando
          }
        >
          <Text
            style={
              styles.saveButtonText
            }
          >
            {salvando
              ? 'SALVANDO...'
              : editandoId
              ? 'SALVAR ALTERAÇÕES'
              : 'CADASTRAR PRODUTO'}
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={() => {
            setForm(
              FORM_VAZIO
            );
            setEditandoId(
              null
            );
            setTela(
              editandoId
                ? 'gerenciar'
                : 'admin'
            );
          }}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            CANCELAR
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  /* =======================================================
     ESCOLHA DA TELA
     ======================================================= */

  let conteudo;

  if (tela === 'login') {
    conteudo =
      renderLogin();
  } else if (
    tela === 'admin'
  ) {
    conteudo =
      renderAdmin();
  } else if (
    tela === 'gerenciar'
  ) {
    conteudo =
      renderGerenciar();
  } else if (
    tela === 'cadastro'
  ) {
    conteudo =
      renderCadastro();
  } else {
    conteudo =
      renderInicio();
  }

  return (
    <SafeAreaView
      style={styles.safe}
    >
      {conteudo}
    </SafeAreaView>
  );
}

/* =========================================================
   COMPONENTE INFO
   ========================================================= */

function Info({
  label,
  value,
}) {
  return (
    <View
      style={styles.infoBox}
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
        }
      >
        {value ||
          'Não informado'}
      </Text>
    </View>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        '#07111f',
    },

    container: {
      padding: 16,
      paddingBottom: 50,
    },

    header: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 18,
    },

    innerHeader: {
      marginBottom: 18,
    },

    logo: {
      color: '#ffffff',
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 2,
    },

    subLogo: {
      color: '#6ea8ff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
      marginTop: 2,
    },

    adminButton: {
      borderWidth: 1,
      borderColor: '#31577f',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },

    adminButtonText: {
      color: '#9fc5ff',
      fontWeight: '900',
      fontSize: 11,
    },

    searchBox: {
      backgroundColor:
        '#0d1c2f',
      borderWidth: 1,
      borderColor:
        '#1d3855',
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
    },

    label: {
      color: '#7f9ab8',
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 8,
    },

    input: {
      backgroundColor:
        '#07111f',
      borderWidth: 1,
      borderColor:
        '#2a4b6c',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 10,
    },

    primaryButton: {
      backgroundColor:
        '#1976ff',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems:
        'center',
      marginTop: 8,
    },

    primaryButtonText: {
      color: '#ffffff',
      fontWeight: '900',
      fontSize: 13,
    },

    voiceButton: {
      marginTop: 10,
      borderWidth: 1,
      borderColor:
        '#345b82',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems:
        'center',
      flexDirection:
        'row',
      justifyContent:
        'center',
      gap: 8,
    },

    voiceIcon: {
      color: '#66a8ff',
      fontSize: 13,
    },

    voiceText: {
      color: '#a8c8ec',
      fontWeight: '900',
      fontSize: 12,
    },

    empty: {
      backgroundColor:
        '#0d1c2f',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        '#1d3855',
      padding: 22,
      alignItems:
        'center',
      marginTop: 8,
    },

    emptyTitle: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '900',
      textAlign:
        'center',
    },

    emptyText: {
      color: '#9db2c9',
      textAlign:
        'center',
      lineHeight: 21,
      marginTop: 8,
    },

    productCard: {
      backgroundColor:
        '#f7f9fc',
      borderRadius: 20,
      padding: 16,
    },

    codeLabel: {
      color: '#7c8795',
      fontSize: 9,
      fontWeight: '900',
    },

    code: {
      color: '#0b1726',
      fontSize: 25,
      fontWeight: '900',
      marginTop: 2,
    },

    productName: {
      color: '#0b1726',
      fontSize: 21,
      fontWeight: '900',
      marginTop: 12,
    },

    categoryBadge: {
      alignSelf:
        'flex-start',
      backgroundColor:
        '#dcecff',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 8,
    },

    categoryBadgeText: {
      color: '#1769aa',
      fontWeight: '900',
      fontSize: 11,
    },

    sectionTitle: {
      color: '#0b1726',
      fontSize: 13,
      fontWeight: '900',
      marginTop: 18,
      marginBottom: 9,
    },

    productText: {
      color: '#334155',
      fontSize: 14,
      lineHeight: 21,
    },

    grid: {
      marginTop: 10,
      gap: 8,
    },

    infoBox: {
      backgroundColor:
        '#eef2f7',
      borderRadius: 11,
      padding: 11,
    },

    infoLabel: {
      color: '#718096',
      fontSize: 9,
      fontWeight: '900',
      marginBottom: 4,
    },

    infoValue: {
      color: '#182433',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 19,
    },

    infoLarge: {
      backgroundColor:
        '#eef2f7',
      borderRadius: 12,
      padding: 13,
    },

    warning: {
      backgroundColor:
        '#fff3cd',
      borderWidth: 1,
      borderColor:
        '#f0d36b',
      borderRadius: 12,
      padding: 13,
      marginTop: 12,
    },

    warningTitle: {
      color: '#805b00',
      fontWeight: '900',
      fontSize: 12,
      marginBottom: 6,
    },

    warningText: {
      color: '#654f12',
      lineHeight: 20,
      fontSize: 13,
    },

    stockRow: {
      flexDirection:
        'row',
      gap: 8,
      marginTop: 12,
    },

    stockBox: {
      flex: 1,
      backgroundColor:
        '#e9f7ef',
      borderRadius: 12,
      padding: 12,
    },

    stockLabel: {
      color: '#47705a',
      fontSize: 9,
      fontWeight: '900',
    },

    stockValue: {
      color: '#126b38',
      fontSize: 22,
      fontWeight: '900',
      marginTop: 4,
    },

    stockValueSmall: {
      color: '#126b38',
      fontSize: 12,
      fontWeight: '800',
      marginTop: 6,
      lineHeight: 17,
    },

    imagePlaceholder: {
      marginTop: 16,
      minHeight: 180,
      borderRadius: 16,
      backgroundColor:
        '#e8edf4',
      borderWidth: 1,
      borderColor:
        '#cbd5e1',
      alignItems:
        'center',
      justifyContent:
        'center',
      padding: 22,
    },

    imageTitle: {
      color: '#334155',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
    },

    imageText: {
      color: '#64748b',
      fontSize: 14,
      fontWeight: '700',
      textAlign:
        'center',
      marginTop: 10,
    },

    productImage: {
      width: '100%',
      height: 260,
      marginTop: 16,
      borderRadius: 16,
      backgroundColor:
        '#eef2f7',
    },

    listenButton: {
      backgroundColor:
        '#0b1726',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems:
        'center',
      marginTop: 14,
    },

    listenText: {
      color: '#ffffff',
      fontWeight: '900',
      fontSize: 12,
    },

    footer: {
      color: '#536a82',
      textAlign:
        'center',
      fontSize: 10,
      marginTop: 24,
    },

    screenTitle: {
      color: '#ffffff',
      fontSize: 23,
      fontWeight: '900',
    },

    screenSubtitle: {
      color: '#8fa6bf',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },

    formCard: {
      backgroundColor:
        '#0d1c2f',
      borderWidth: 1,
      borderColor:
        '#1d3855',
      borderRadius: 18,
      padding: 16,
    },

    campoContainer: {
      marginBottom: 14,
    },

    campoLabel: {
      color: '#7f9ab8',
      fontSize: 10,
      fontWeight: '900',
      marginBottom: 7,
      marginTop: 12,
    },

    campoInput: {
      backgroundColor:
        '#07111f',
      borderWidth: 1,
      borderColor:
        '#2a4b6c',
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingVertical: 12,
      color: '#ffffff',
      fontSize: 15,
    },

    campoMultiline: {
      minHeight: 90,
      textAlignVertical:
        'top',
    },

    secondaryButton: {
      borderWidth: 1,
      borderColor:
        '#365573',
      borderRadius: 12,
      paddingVertical: 13,
      alignItems:
        'center',
      marginTop: 10,
    },

    secondaryButtonText: {
      color: '#a8c8ec',
      fontWeight: '900',
      fontSize: 12,
    },

    saveButton: {
      backgroundColor:
        '#16803d',
      borderRadius: 12,
      paddingVertical: 15,
      alignItems:
        'center',
      marginTop: 12,
    },

    saveButtonText: {
      color: '#ffffff',
      fontWeight: '900',
      fontSize: 13,
    },

    adminHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      marginBottom: 18,
    },

    logoutButton: {
      borderWidth: 1,
      borderColor:
        '#6b3840',
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
    },

    logoutText: {
      color: '#ff9ba6',
      fontSize: 10,
      fontWeight: '900',
    },

    adminMenuCard: {
      backgroundColor:
        '#0d1c2f',
      borderWidth: 1,
      borderColor:
        '#1d3855',
      borderRadius: 18,
      padding: 17,
    },

    adminMenuTitle: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '900',
    },

    adminMenuText: {
      color: '#9db2c9',
      fontSize: 13,
      lineHeight: 20,
      marginTop: 7,
      marginBottom: 8,
    },

    searchManageButton: {
      backgroundColor:
        '#102a45',
      borderWidth: 1,
      borderColor:
        '#3274ad',
      borderRadius: 12,
      paddingVertical: 15,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      gap: 9,
      marginTop: 10,
    },

    searchManageIcon: {
      fontSize: 19,
    },

    searchManageText: {
      color: '#b9d8ff',
      fontWeight: '900',
      fontSize: 12,
    },

    infoNotice: {
      backgroundColor:
        '#0b1726',
      borderWidth: 1,
      borderColor:
        '#263f59',
      borderRadius: 15,
      padding: 15,
      marginTop: 14,
    },

    infoNoticeTitle: {
      color: '#6ea8ff',
      fontSize: 11,
      fontWeight: '900',
    },

    infoNoticeText: {
      color: '#8fa6bf',
      fontSize: 12,
      lineHeight: 19,
      marginTop: 6,
    },

    backRow: {
      marginBottom: 10,
    },

    backButton: {
      alignSelf:
        'flex-start',
      borderWidth: 1,
      borderColor:
        '#31577f',
      borderRadius: 9,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },

    backText: {
      color: '#9fc5ff',
      fontWeight: '900',
      fontSize: 10,
    },

    manageSearchCard: {
      backgroundColor:
        '#0d1c2f',
      borderWidth: 1,
      borderColor:
        '#1d3855',
      borderRadius: 18,
      padding: 16,
    },

    searchHint: {
      color: '#607991',
      fontSize: 10,
      marginTop: 6,
    },

    categoryScroll: {
      marginTop: 4,
    },

    categoryButton: {
      borderWidth: 1,
      borderColor:
        '#365573',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginRight: 7,
    },

    categoryButtonSelected: {
      backgroundColor:
        '#1976ff',
      borderColor:
        '#1976ff',
    },

    categoryButtonText: {
      color: '#9db2c9',
      fontWeight: '800',
      fontSize: 11,
    },

    categoryButtonTextSelected: {
      color: '#ffffff',
    },

    resultsHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginTop: 18,
      marginBottom: 8,
    },

    resultsTitle: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
    },

    resultsCount: {
      color: '#6ea8ff',
      fontSize: 13,
      fontWeight: '900',
    },

    adminProductCard: {
      backgroundColor:
        '#0d1c2f',
      borderWidth: 1,
      borderColor:
        '#1d3855',
      borderRadius: 15,
      padding: 13,
      marginBottom: 9,
    },

    adminProductTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    adminProductInfo: {
      flex: 1,
      paddingRight: 10,
    },

    adminProductCode: {
      color: '#6ea8ff',
      fontSize: 12,
      fontWeight: '900',
    },

    adminProductName: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '900',
      marginTop: 3,
    },

    adminProductApplication: {
      color: '#8fa6bf',
      fontSize: 11,
      lineHeight: 17,
      marginTop: 4,
    },

    adminProductMeta: {
      marginTop: 6,
    },

    adminMetaText: {
      color: '#607991',
      fontSize: 10,
      fontWeight: '800',
    },

    editButton: {
      backgroundColor:
        '#1976ff',
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    editButtonText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '900',
    },

    limitNotice: {
      backgroundColor:
        '#102a45',
      borderWidth: 1,
      borderColor:
        '#3274ad',
      borderRadius: 12,
      padding: 12,
      marginTop: 6,
    },

    limitNoticeText: {
      color: '#9fc5ff',
      textAlign:
        'center',
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '700',
    },

    categoryFormContainer: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 7,
      marginBottom: 5,
    },

    categoryFormButton: {
      borderWidth: 1,
      borderColor:
        '#365573',
      borderRadius: 9,
      paddingHorizontal: 11,
      paddingVertical: 9,
    },

    categoryFormButtonSelected: {
      backgroundColor:
        '#1976ff',
      borderColor:
        '#1976ff',
    },

    categoryFormText: {
      color: '#9db2c9',
      fontWeight: '800',
      fontSize: 11,
    },

    categoryFormTextSelected: {
      color: '#ffffff',
    },
  });